import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OtpVerification } from '../entities/otp-verification.entity';
import { User } from '../../users/entities/user.entity';
import { SmsService } from '../../../shared/services/sms.service';
import { EmailService } from '../../../shared/services/email.service';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    private configService: ConfigService,
    private smsService: SmsService,
    private emailService: EmailService,
    private encryptionService: EncryptionService,
  ) {}

  async sendOtp(user: User, channel: 'sms' | 'email' | 'whatsapp' = 'sms'): Promise<void> {
    await this.invalidateExistingOtps(user.id);

    const code = this.generateCode();
    const codeHash = await this.encryptionService.hashPassword(code);
    const expirationSeconds = this.configService.get<number>('jwt.otpExpiration', 600);

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

    try {
      switch (channel) {
        case 'email':
          if (user.email) {
            await this.emailService.sendOtp(user.email, code, user.firstName);
          } else {
            await this.smsService.sendOtp(user.phone, code, user.firstName);
          }
          break;
        case 'whatsapp':
          await this.smsService.sendSms(user.phone, `AURA OS - Bonjour ${user.firstName}, votre code est : ${code}`);
          break;
        case 'sms':
        default:
          await this.smsService.sendOtp(user.phone, code, user.firstName);
          break;
      }
      this.logger.log(`OTP sent to ${user.phone} via ${channel}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP via ${channel}: ${error.message}`);
    }
    // Always log OTP in development mode for testing
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    if (nodeEnv !== 'production') {
      this.logger.warn(`[DEV] OTP code for ${user.email || user.phone}: ${code}`);
    }
    // Log OTP for dev testing — in production, only email/SMS is used
    if (nodeEnv !== 'production') {
      this.logger.warn(`[DEV] OTP for ${user.email || user.phone}: ${code}`);
    }
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: { userId, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) return false;
    if (otp.attempts >= otp.maxAttempts) return false;
    if (new Date() > otp.expiresAt) return false;

    const isValid = await this.encryptionService.verifyPassword(otp.codeHash, code);

    if (isValid) {
      otp.isUsed = true;
      await this.otpRepository.save(otp);
      return true;
    }

    otp.attempts += 1;
    await this.otpRepository.save(otp);
    return false;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async invalidateExistingOtps(userId: string): Promise<void> {
    await this.otpRepository.update(
      { userId, isUsed: false },
      { isUsed: true },
    );
  }
}
