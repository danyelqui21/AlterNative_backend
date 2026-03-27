import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@lagunapp-backend/database';
import { AuthModule } from '@lagunapp-backend/auth';
import { User } from '../../../../auth-service/src/app/entities/user.entity';
import { Event } from '../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../events-service/src/app/entities/ticket-type.entity';
import { Restaurant } from '../../../../restaurants-service/src/app/entities/restaurant.entity';
import { Tour } from '../../../../tours-service/src/app/entities/tour.entity';
import { Clan } from '../../../../clans-service/src/app/entities/clan.entity';
import { ClanMember } from '../../../../clans-service/src/app/entities/clan-member.entity';
import { ClanMessage } from '../../../../clans-service/src/app/entities/clan-message.entity';
import { ClanCreationConfig } from '../../../../clans-service/src/app/entities/clan-creation-config.entity';
import { HealthController } from './app.controller';
import { AuthController } from './controllers/auth.controller';
import { EventsController } from './controllers/events.controller';
import { RestaurantsController } from './controllers/restaurants.controller';
import { ToursController } from './controllers/tours.controller';
import { ClansController } from './controllers/clans.controller';
import { AuthGatewayService } from './services/auth-gateway.service';
import { EventsGatewayService } from './services/events-gateway.service';
import { RestaurantsGatewayService } from './services/restaurants-gateway.service';
import { ToursGatewayService } from './services/tours-gateway.service';
import { ClansGatewayService } from './services/clans-gateway.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRoot(),
    AuthModule,
    TypeOrmModule.forFeature([
      User, Event, TicketType,
      Restaurant, Tour,
      Clan, ClanMember, ClanMessage, ClanCreationConfig,
    ]),
  ],
  controllers: [
    HealthController, AuthController, EventsController,
    RestaurantsController, ToursController, ClansController,
  ],
  providers: [
    AuthGatewayService, EventsGatewayService,
    RestaurantsGatewayService, ToursGatewayService,
    ClansGatewayService,
  ],
})
export class AppModule {}
