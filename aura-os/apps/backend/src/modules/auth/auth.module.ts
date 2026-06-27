import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { TwoFactorService } from './services/two-factor.service';
import { SessionService } from './services/session.service';
import { DeviceService } from './services/device.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { OtpVerification } from './entities/otp-verification.entity';
import { Session } from './entities/session.entity';
import { Device } from './entities/device.entity';

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    TypeOrmModule.forFeature([OtpVerification, Session, Device]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpiration', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TwoFactorService,
    SessionService,
    DeviceService,
    JwtStrategy,
    RefreshTokenStrategy,
  ],
  exports: [AuthService, OtpService, SessionService],
})
export class AuthModule {}
