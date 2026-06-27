import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService, TokenPayload } from './auth.service';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { EncryptionService } from '../../shared/services/encryption.service';
import { EmailService } from '../../shared/services/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { Session } from './entities/session.entity';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let otpService: jest.Mocked<OtpService>;
  let sessionService: jest.Mocked<SessionService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() } },
        { provide: getRepositoryToken(Company), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(OtpVerification), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() } },
        { provide: getRepositoryToken(Session), useValue: { findOne: jest.fn(), update: jest.fn() } },
        { provide: OtpService, useValue: { sendOtp: jest.fn(), verifyOtp: jest.fn() } },
        { provide: SessionService, useValue: { create: jest.fn(), findByTokenId: jest.fn(), verifyRefreshToken: jest.fn(), remove: jest.fn(), removeAll: jest.fn() } },
        { provide: EncryptionService, useValue: { hashPassword: jest.fn(), verifyPassword: jest.fn() } },
        { provide: EmailService, useValue: { sendWelcome: jest.fn(), sendOtp: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-token'), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret-key-that-is-32-chars!') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepo = module.get(getRepositoryToken(User));
    otpService = module.get(OtpService);
    sessionService = module.get(SessionService);
    encryptionService = module.get(EncryptionService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('register', () => {
    it('should throw ConflictException if phone already exists', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+22673484312' } as User);

      await expect(
        service.register({ phone: '+22673484312', firstName: 'A', lastName: 'B', companyName: 'Test', countryCode: 'BF', city: 'Ouaga' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and company when phone is new', async () => {
      usersRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      usersRepo.create.mockReturnValue({ id: 'u1' } as User);
      otpService.sendOtp = jest.fn().mockResolvedValue(undefined);

      const result = await service.register({
        phone: '+22673484312',
        firstName: 'Kevin',
        lastName: 'S',
        companyName: 'TestCo',
        countryCode: 'BF',
        city: 'Ouaga',
      });

      expect(result.message).toContain('Code de vérification envoyé');
      expect(otpService.sendOtp).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phone: '+226', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if OTP is invalid', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+226' } as User);
      otpService.verifyOtp = jest.fn().mockResolvedValue(false);

      await expect(
        service.verifyOtp({ phone: '+226', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens when OTP is valid', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+226', companyId: 'c1', email: '', firstName: 'K' } as User);
      otpService.verifyOtp = jest.fn().mockResolvedValue(true);
      configService.get = jest.fn()
        .mockReturnValueOnce('test-secret-key-that-is-32-chars!') // jwt.secret
        .mockReturnValueOnce('15m')  // jwt.accessExpiration
        .mockReturnValueOnce('7d')   // jwt.refreshExpiration
        .mockReturnValueOnce('test-secret-key-that-is-32-chars!'); // jwt.secret again
      sessionService.create = jest.fn().mockResolvedValue({ session: { id: 's1' }, tokenId: 'tok123' });

      const result = await service.verifyOtp({ phone: '+226', code: '123456' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });

  describe('login', () => {
    it('should throw if user has no passcode', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+226', passcodeHash: null } as User);

      await expect(service.login('+226', '1234')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if passcode is wrong', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+226', passcodeHash: 'hash', isPhoneVerified: true } as User);
      encryptionService.verifyPassword = jest.fn().mockResolvedValue(false);

      await expect(service.login('+226', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if phone not verified', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', phone: '+226', passcodeHash: 'hash', isPhoneVerified: false } as User);
      encryptionService.verifyPassword = jest.fn().mockResolvedValue(true);

      await expect(service.login('+226', '1234')).rejects.toThrow(BadRequestException);
    });
  });

  describe('setPasscode', () => {
    it('should throw if currentPassword is wrong', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', passcodeHash: 'hash' } as User);
      encryptionService.verifyPassword = jest.fn().mockResolvedValue(false);

      await expect(service.setPasscode('1', 'old', 'new')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if new passcode too short', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', passcodeHash: null } as User);

      await expect(service.setPasscode('1', undefined, 'ab')).rejects.toThrow(BadRequestException);
    });

    it('should allow setting passcode when none exists', async () => {
      usersRepo.findOne.mockResolvedValue({ id: '1', passcodeHash: null } as User);
      encryptionService.hashPassword = jest.fn().mockResolvedValue('newHash');

      await service.setPasscode('1', undefined, '12345678');

      expect(encryptionService.hashPassword).toHaveBeenCalledWith('12345678');
    });
  });
});
