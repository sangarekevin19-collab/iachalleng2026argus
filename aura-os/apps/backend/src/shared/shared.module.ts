import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { StorageService } from './services/storage.service';
import { EncryptionService } from './services/encryption.service';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [RedisService, EmailService, SmsService, StorageService, EncryptionService, ConfigService, MetricsService, MetricsMiddleware],
  exports: [RedisService, EmailService, SmsService, StorageService, EncryptionService, MetricsService, MetricsMiddleware],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(MetricsMiddleware)
      .exclude('health/metrics')
      .forRoutes('*');
  }
}
