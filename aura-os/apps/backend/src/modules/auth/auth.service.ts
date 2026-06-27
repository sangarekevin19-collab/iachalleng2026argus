import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { EncryptionService } from '../../shared/services/encryption.service';
import { EmailService } from '../../shared/services/email.service';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { Session } from './entities/session.entity';

export interface TokenPayload {
  sub: string;
  email?: string;
  phone: string;
  companyId: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private sessionService: SessionService,
    private encryptionService: EncryptionService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto, deviceInfo?: Record<string, any>): Promise<{ message: string }> {
    const existingPhone = await this.usersRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    if (dto.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    const userId = uuidv4();
    const companyId = uuidv4();
    // Auto-detect best channel: use email if available and SMS (Twilio) not configured
    const twilioSid = this.configService.get<string>('twilio.accountSid', '');
    const hasTwilio = twilioSid && twilioSid.startsWith('AC');
    let channel: 'sms' | 'email' | 'whatsapp';
    if (dto.preferredOtpChannel === 'email' || (dto.email && !hasTwilio)) {
      channel = 'email';
    } else if (dto.preferredOtpChannel === 'whatsapp') {
      channel = 'whatsapp';
    } else if (hasTwilio) {
      channel = 'sms';
    } else {
      channel = dto.email ? 'email' : 'sms'; // fallback to email if available
    }

    const user = this.usersRepository.create({
      id: userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      countryCode: dto.countryCode,
      city: dto.city,
      whatsapp: dto.whatsapp,
      role: 'owner',
      isPhoneVerified: false,
      isEmailVerified: false,
      companyId,
    });

    const company = this.companiesRepository.create({
      id: companyId,
      name: dto.companyName,
      countryCode: dto.countryCode,
      city: dto.city,
      ownerId: userId,
    });

    await this.companiesRepository.save(company);
    await this.usersRepository.save(user);

    // Generate OTP code for dev mode response
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    let devOtpCode: string | undefined;
    if (nodeEnv !== 'production') {
      // In dev mode, generate and return the code directly
      devOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await this.encryptionService.hashPassword(devOtpCode);
      const expirationSeconds = this.configService.get<number>('jwt.otpExpiration', 600);
      const { v4: uuidv4 } = require('uuid');
      const otp = this.otpRepository.create({
        id: uuidv4(),
        userId: user.id,
        codeHash,
        channel,
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + expirationSeconds * 1000),
        isUsed: false,
      });
      await this.otpRepository.save(otp);
      this.logger.log(`[DEV] OTP for ${user.email || user.phone}: ${devOtpCode}`);
    }

    await this.otpService.sendOtp(user, channel);

    this.logger.log(`User registered: ${dto.phone}`);

    return {
      message: `Code de vérification envoyé par ${channel === 'sms' ? 'SMS' : channel === 'email' ? 'email' : 'WhatsApp'}`,
      ...(devOtpCode ? { devOtpCode } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, deviceInfo?: Record<string, any>): Promise<AuthTokens> {
    const user = await this.usersRepository.findOne({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const isValid = await this.otpService.verifyOtp(user.id, dto.code);
    if (!isValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    await this.usersRepository.update(user.id, {
      isPhoneVerified: true,
    });

    const tokens = await this.generateTokens(user);
    const { tokenId } = await this.sessionService.create(user.id, tokens.refreshToken, deviceInfo);

    // Embed tokenId in the refresh token for fast lookup
    const refreshPayload = this.jwtService.verify(tokens.refreshToken, {
      secret: this.configService.get<string>('jwt.secret'),
    });
    const { exp, iat, ...rest } = refreshPayload;
    const newRefreshToken = this.jwtService.sign({
      ...rest,
      tokenId,
    });

    const result: AuthTokens = {
      accessToken: tokens.accessToken,
      refreshToken: newRefreshToken,
      expiresIn: tokens.expiresIn,
    };

    try {
      await this.emailService.sendWelcome(
        user.email || '',
        user.firstName,
        user.companyId,
      );
    } catch {
      this.logger.warn(`Failed to send welcome email to ${user.email}`);
    }

    this.logger.log(`User verified: ${dto.phone}`);

    return result;
  }

  async login(phone: string, passcode: string): Promise<AuthTokens> {
    const user = await this.usersRepository.findOne({ where: { phone } });
    if (!user || !user.passcodeHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await this.encryptionService.verifyPassword(user.passcodeHash, passcode);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isPhoneVerified) {
      throw new BadRequestException('Compte non vérifié');
    }

    const tokens = await this.generateTokens(user);
    const { tokenId } = await this.sessionService.create(user.id, tokens.refreshToken);

    const refreshPayload = this.jwtService.verify(tokens.refreshToken, {
      secret: this.configService.get<string>('jwt.secret'),
    });
    const { exp, iat, ...rest2 } = refreshPayload;
    const newRefreshToken = this.jwtService.sign({
      ...rest2,
      tokenId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: newRefreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async setPasscode(userId: string, currentPasscode: string | undefined, newPasscode: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (user.passcodeHash) {
      if (!currentPasscode) {
        throw new BadRequestException('Le mot de passe actuel est requis');
      }
      const isValid = await this.encryptionService.verifyPassword(user.passcodeHash, currentPasscode);
      if (!isValid) {
        throw new UnauthorizedException('Mot de passe actuel incorrect');
      }
    }

    if (!newPasscode || newPasscode.length < 4) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 4 caractères');
    }

    const hash = await this.encryptionService.hashPassword(newPasscode);
    await this.usersRepository.update(userId, { passcodeHash: hash });
    this.logger.log(`Passcode updated for user ${userId}`);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<TokenPayload & { tokenId?: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Fast lookup by tokenId if present
      let session: Session | null = null;
      if (payload.tokenId) {
        session = await this.sessionService.findByTokenId(payload.sub, payload.tokenId);
        if (session && !(await this.sessionService.verifyRefreshToken(session, refreshToken))) {
          session = null;
        }
      } else {
        // Fallback for old tokens without tokenId
        session = await this.sessionService.findByRefreshToken(payload.sub, refreshToken);
      }

      if (!session) {
        throw new UnauthorizedException('Session invalide');
      }

      const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      const tokens = await this.generateTokens(user);
      const { tokenId: newTokenId } = await this.sessionService.create(user.id, tokens.refreshToken);

      // Remove old session
      await this.sessionService.remove(session.id);

      // Embed new tokenId
      const newRefreshPayload = this.jwtService.verify(tokens.refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      const { exp, iat, ...rest3 } = newRefreshPayload;
      const newRefreshToken = this.jwtService.sign({
        ...rest3,
        tokenId: newTokenId,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: newRefreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch {
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<{ tokenId?: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      if (payload.tokenId) {
        const session = await this.sessionService.findByTokenId(userId, payload.tokenId);
        if (session) {
          await this.sessionService.remove(session.id);
          return;
        }
      }
    } catch {
      // fallback
    }
    // Fallback: slow path
    const session = await this.sessionService.findByRefreshToken(userId, refreshToken);
    if (session) {
      await this.sessionService.remove(session.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.removeAll(userId);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      companyId: user.companyId,
      type: 'access',
    };

    const accessExp = this.configService.get<string>('jwt.accessExpiration', '15m');
    const refreshExp = this.configService.get<string>('jwt.refreshExpiration', '7d');

    const accessToken = this.jwtService.sign(payload, { expiresIn: accessExp });
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExp },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(accessExp),
    };
  }

  private parseExpirationToSeconds(exp: string): number {
    const unit = exp.slice(-1);
    const value = parseInt(exp.slice(0, -1), 10);
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}
