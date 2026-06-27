import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Session } from '../entities/session.entity';
import { EncryptionService } from '../../../shared/services/encryption.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Create a session. Returns { session, tokenId } so the tokenId can be
   * embedded in the refresh token for fast lookup without Argon2 N+1.
   */
  async create(userId: string, refreshToken: string, deviceInfo?: Record<string, any>): Promise<{ session: Session; tokenId: string }> {
    const tokenId = randomBytes(16).toString('hex');
    const tokenHash = await this.encryptionService.hashPassword(refreshToken);

    const session = this.sessionRepository.create({
      userId,
      tokenId,
      refreshTokenHash: tokenHash,
      deviceName: deviceInfo?.deviceName,
      deviceType: deviceInfo?.deviceType,
      ipAddress: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const saved = await this.sessionRepository.save(session);
    return { session: saved, tokenId };
  }

  /**
   * Find session by tokenId (fast index lookup), then verify hash.
   * Avoids N+1 Argon2 comparisons.
   */
  async findByTokenId(userId: string, tokenId: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({
      where: { userId, tokenId, isActive: true },
    });
    return session;
  }

  /**
   * Verify the refresh token hash against a session.
   */
  async verifyRefreshToken(session: Session, refreshToken: string): Promise<boolean> {
    return this.encryptionService.verifyPassword(session.refreshTokenHash, refreshToken);
  }

  /**
   * Legacy: find by refresh token (slow — Argon2 N+1).
   * Kept for backward compat but prefer findByTokenId.
   */
  async findByRefreshToken(userId: string, refreshToken: string): Promise<Session | null> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      const isValid = await this.encryptionService.verifyPassword(
        session.refreshTokenHash,
        refreshToken,
      );
      if (isValid) return session;
    }
    return null;
  }

  async updateRefreshToken(sessionId: string, newToken: string): Promise<void> {
    const newTokenId = randomBytes(16).toString('hex');
    await this.sessionRepository.update(sessionId, {
      tokenId: newTokenId,
      refreshTokenHash: await this.encryptionService.hashPassword(newToken),
      lastActivityAt: new Date(),
    });
  }

  async remove(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { isActive: false });
  }

  async removeAll(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }
}
