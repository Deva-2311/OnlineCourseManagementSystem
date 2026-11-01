import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  // Cookie Parser for HTTP-only cookies
  app.use(cookieParser());

  // API Prefix
  const apiPrefix = configService.get<string>('apiPrefix') || '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS Configuration
  const frontendUrl = configService.get<string>('frontendUrl');
  if (frontendUrl) {
    app.enableCors({
      origin: frontendUrl,
      credentials: true,
    });
    logger.log(`CORS enabled for origin: ${frontendUrl}`);
  }

  // Swagger Documentation
  const swaggerEnabled = configService.get<boolean>('swagger.enabled');
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Online Course Management System API')
      .setDescription('API documentation for the OCMS backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = configService.get<string>('swagger.path') || '/api-docs';
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(`Swagger documentation available at: ${swaggerPath}`);
  }

  // Start Application
  const port = configService.get<number>('port') || 3001;
  await app.listen(port);
  logger.log(`Application successfully started on port ${port}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
