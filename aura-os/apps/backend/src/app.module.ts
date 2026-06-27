import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { AgentsModule } from './modules/agents/agents.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MemoryModule } from './modules/memory/memory.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SharedModule } from './shared/shared.module';
import { SnakeCaseNamingStrategy } from './shared/snake-case-naming.strategy';
import { AuraCoreModule } from './aura-core/aura-core.module';
import { DashboardEngineModule } from './dashboard-engine/dashboard-engine.module';
import { AutomationModule } from './modules/automation/automation.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
      // Strict rate limit for auth routes
      { name: 'auth', ttl: 900000, limit: 10 },
    ]),
    ScheduleModule.forRoot(),
  ],
  exports: [ConfigModule],
})
class GlobalModule {}

@Module({
  imports: [
    GlobalModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host', 'localhost'),
        port: config.get<number>('database.port', 5432),
        username: config.get<string>('database.username', 'aura'),
        password: config.get<string>('database.password', 'aura_password'),
        database: config.get<string>('database.name', 'aura_os'),
        schema: config.get<string>('database.schema', 'public'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<boolean>('database.synchronize', false),
        logging: config.get<boolean>('database.logging', false),
        ssl: config.get<boolean>('database.ssl', false) ? { rejectUnauthorized: false } : undefined,
        namingStrategy: new SnakeCaseNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    AgentsModule,
    OnboardingModule,
    NotificationsModule,
    MemoryModule,
    SettingsModule,
    // ─── AURA CORE v2.0 — 100% LLM-driven ───
    AuraCoreModule,
    DashboardEngineModule,
    AutomationModule,
  ],
})
export class AppModule {}
