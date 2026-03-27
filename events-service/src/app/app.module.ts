import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@lagunapp-backend/database';
import { AuthModule } from '@lagunapp-backend/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Event } from './entities/event.entity';
import { TicketType } from './entities/ticket-type.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRoot(),
    AuthModule,
    TypeOrmModule.forFeature([Event, TicketType]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
