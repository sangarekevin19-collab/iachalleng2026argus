import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');
  const isProd = nodeEnv === 'production';

  // ─── Security headers ───
  app.use(helmet());

  // ─── CORS ───
  const allowedOrigins = isProd
    ? [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Versioning is handled per-controller via @Controller('v1/...') prefixes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');

  // ─── Swagger (dev only) ───
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AURA OS API')
      .setDescription('African Unified Reasoning Assistant Operating System')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & User Management')
      .addTag('onboarding', 'Company Onboarding & AI Interview')
      .addTag('agents', 'AI Agent Management')
      .addTag('pos', 'Point of Sale')
      .addTag('inventory', 'Inventory Management')
      .addTag('crm', 'Customer Relationship Management')
      .addTag('finance', 'Financial Management')
      .addTag('reports', 'Reports & Analytics')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ─── Critical env validation ───
  if (isProd) {
    const jwtSecret = configService.get<string>('jwt.secret', '');
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('❌ FATAL: JWT_SECRET must be set and at least 32 characters in production');
      process.exit(1);
    }
  }

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);

  console.log(`🚀 AURA OS Backend running on http://localhost:${port} [${nodeEnv}]`);
  if (!isProd) {
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
