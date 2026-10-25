import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const standardSecurityHeaders = helmet();
  const swaggerSecurityHeaders = helmet({ contentSecurityPolicy: false });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const securityHeaders = request.path.startsWith('/api/docs')
      ? swaggerSecurityHeaders
      : standardSecurityHeaders;
    securityHeaders(request, response, next);
  });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Life Link API')
    .setDescription('API documentation for the Life Link backend.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  // basic rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, // limit each IP to N requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/auth', authLimiter);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap();
