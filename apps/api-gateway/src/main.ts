/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LagunApp API / API de LagunApp')
    .setDescription(
      'Backend API for the LagunApp entertainment platform.\nAPI del backend para la plataforma de entretenimiento LagunApp.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag(
      'Auth / Autenticación',
      'User authentication and profile management / Autenticación y gestión de perfiles',
    )
    .addTag(
      'Events / Eventos',
      'Event discovery, creation and management / Descubrimiento, creación y gestión de eventos',
    )
    .addTag(
      'Restaurants / Restaurantes',
      'Restaurant browsing and reservations / Exploración de restaurantes y reservaciones',
    )
    .addTag('Tours', 'Tours and experiences / Tours y experiencias')
    .addTag(
      'Clans / Clanes',
      'ClanCity - Interest-based groups / ClanCity - Grupos por intereses',
    )
    .addTag(
      'Artists / Artistas',
      'Local artists with Spotify integration / Artistas locales con integración de Spotify',
    )
    .addTag(
      'Reviews / Reseñas',
      'Event reviews and ratings / Reseñas y calificaciones de eventos',
    )
    .addTag(
      'Config / Configuración',
      'Platform configuration and feature flags / Configuración de plataforma y módulos',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
