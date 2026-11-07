import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AppModule } from './app.module';

export const API_PREFIX = 'api/v1';

// Endpoints that accept credentials or send email get a strict per-IP limit.
const SENSITIVE_AUTH_ROUTES = [
  'login',
  'register',
  'verify-email',
  'resend-verification',
  'forgot-password',
  'reset-password',
].map((route) => `/${API_PREFIX}/auth/${route}`);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (config.get<boolean>('TRUST_PROXY')) app.set('trust proxy', 1);
  app.enableShutdownHooks();
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const standardHeaders = helmet();
  const swaggerHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api/docs') ? swaggerHeaders : standardHeaders)(
      req,
      res,
      next,
    ),
  );

  const origins = config
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins?.length ? origins : !isProduction,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(
    SENSITIVE_AUTH_ROUTES,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: config.getOrThrow<number>('AUTH_RATE_LIMIT_MAX'),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Too many attempts, please try again later',
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Life Link API')
    .setDescription(
      'Blood & organ donation platform. Authenticate with POST /auth/login, then click Authorize and paste the accessToken.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
    {
      swaggerOptions: { persistAuthorization: true },
    },
  );

  await app.listen(config.getOrThrow<number>('PORT'));
}
void bootstrap();
