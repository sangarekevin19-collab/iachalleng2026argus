import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {}

  async generateSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: `AURA OS (${userId})`,
      issuer: 'AURA OS',
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    const encryptedSecret = this.encryptionService.encrypt(
      secret.base32,
      this.configService.get<string>('jwt.secret'),
    );

    await this.usersRepository.update(userId, {
      twoFactorSecret: encryptedSecret,
      twoFactorEnabled: false,
    });

    return { secret: secret.base32, qrCode };
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return false;

    const secret = this.encryptionService.decrypt(
      user.twoFactorSecret,
      this.configService.get<string>('jwt.secret'),
    );

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async enable(userId: string, token: string): Promise<boolean> {
    const isValid = await this.verifyToken(userId, token);
    if (isValid) {
      await this.usersRepository.update(userId, { twoFactorEnabled: true });
      this.logger.log(`2FA enabled for user ${userId}`);
    }
    return isValid;
  }

  async disable(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  }
}
