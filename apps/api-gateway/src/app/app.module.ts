import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '@lagunapp-backend/database';
import { AuthModule } from '@lagunapp-backend/auth';
import { MessagingModule } from '@lagunapp-backend/messaging';
// PostgreSQL entities
import { User } from '../../../../auth-service/src/app/entities/user.entity';
import { Event } from '../../../../events-service/src/app/entities/event.entity';
import { TicketType } from '../../../../events-service/src/app/entities/ticket-type.entity';
import { Restaurant } from '../../../../restaurants-service/src/app/entities/restaurant.entity';
import { Tour } from '../../../../tours-service/src/app/entities/tour.entity';
import { Clan } from '../../../../clans-service/src/app/entities/clan.entity';
import { ClanMember } from '../../../../clans-service/src/app/entities/clan-member.entity';
import { ClanMessage } from '../../../../clans-service/src/app/entities/clan-message.entity';
import { ClanCreationConfig } from '../../../../clans-service/src/app/entities/clan-creation-config.entity';
import { Artist } from './entities/artist.entity';
import { PlatformConfig } from './entities/platform-config.entity';
import { ModerationReport } from './entities/moderation-report.entity';
import { BlogPost } from './entities/blog-post.entity';
import { Coupon } from './entities/coupon.entity';
import { Ticket } from './entities/ticket.entity';
import { Subscription } from './entities/subscription.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { Wallet, WalletTransaction } from './entities/wallet.entity';
import { Verification } from './entities/verification.entity';
import { DeviceSession } from './entities/device-session.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';
import { Theater } from './entities/theater.entity';
import { SeatingLayout } from './entities/seating-layout.entity';
import { Seat } from './entities/seat.entity';
import { TheaterEvent } from './entities/theater-event.entity';
import { SeatReservation } from './entities/seat-reservation.entity';
import { Notification } from './entities/notification.entity';
import { UserNotification } from './entities/user-notification.entity';
import { FcmToken } from './entities/fcm-token.entity';
// MongoDB schemas
import { ArtistProfile, ArtistProfileSchema } from './schemas/artist-profile.schema';
import { EventReview, EventReviewSchema } from './schemas/event-review.schema';
// Controllers
import { HealthController } from './app.controller';
import { AuthController } from './controllers/auth.controller';
import { EventsController } from './controllers/events.controller';
import { RestaurantsController } from './controllers/restaurants.controller';
import { ToursController } from './controllers/tours.controller';
import { ClansController } from './controllers/clans.controller';
import { ArtistsController } from './controllers/artists.controller';
import { ConfigController } from './controllers/config.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { ModerationController } from './controllers/moderation.controller';
import { AdminEventsController } from './controllers/admin-events.controller';
import { AdminRestaurantsController } from './controllers/admin-restaurants.controller';
import { AdminToursController } from './controllers/admin-tours.controller';
import { AdminBlogController } from './controllers/admin-blog.controller';
import { BlogController } from './controllers/blog.controller';
import { AdminCouponsController } from './controllers/admin-coupons.controller';
import { CouponsController } from './controllers/coupons.controller';
import { AdminTicketsController } from './controllers/admin-tickets.controller';
import { TicketsController } from './controllers/tickets.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminAdsController } from './controllers/admin-ads.controller';
import { AdminWalletsController } from './controllers/admin-wallets.controller';
import { WalletController } from './controllers/wallet.controller';
import { AdminVerificationsController } from './controllers/admin-verifications.controller';
import { VerificationsController } from './controllers/verifications.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { PaymentsController } from './controllers/payments.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { TheatersController } from './controllers/theaters.controller';
import { AdminTheatersController } from './controllers/admin-theaters.controller';
import { UploadsController } from './controllers/uploads.controller';
// Services
import { AuthGatewayService } from './services/auth-gateway.service';
import { EventsGatewayService } from './services/events-gateway.service';
import { RestaurantsGatewayService } from './services/restaurants-gateway.service';
import { ToursGatewayService } from './services/tours-gateway.service';
import { ClansGatewayService } from './services/clans-gateway.service';
import { ArtistsGatewayService } from './services/artists-gateway.service';
import { SpotifyService } from './services/spotify.service';
import { ConfigGatewayService } from './services/config-gateway.service';
import { ReviewsGatewayService } from './services/reviews-gateway.service';
import { AdminUsersGatewayService } from './services/admin-users-gateway.service';
import { ModerationGatewayService } from './services/moderation-gateway.service';
import { AdminEventsGatewayService } from './services/admin-events-gateway.service';
import { AdminRestaurantsGatewayService } from './services/admin-restaurants-gateway.service';
import { AdminToursGatewayService } from './services/admin-tours-gateway.service';
import { AdminBlogGatewayService } from './services/admin-blog-gateway.service';
import { AdminCouponsGatewayService } from './services/admin-coupons-gateway.service';
import { TicketsGatewayService } from './services/tickets-gateway.service';
import { SubscriptionsGatewayService } from './services/subscriptions-gateway.service';
import { AdsGatewayService } from './services/ads-gateway.service';
import { WalletsGatewayService } from './services/wallets-gateway.service';
import { VerificationsGatewayService } from './services/verifications-gateway.service';
import { NotificationsGatewayService } from './services/notifications-gateway.service';
import { FirebasePushService } from './services/firebase-push.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { EmailService } from './services/email.service';
import { IpGeolocationService } from './services/ip-geolocation.service';
import { StripeService } from './services/stripe.service';
import { PaymentsGatewayService } from './services/payments-gateway.service';
import { TheatersGatewayService } from './services/theaters-gateway.service';
import { SeatReservationService } from './services/seat-reservation.service';
import { SeatsGateway } from './gateways/seats.gateway';
import { UploadService } from './services/upload.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRoot(),
    AuthModule,
    MessagingModule.forRoot(),
    // PostgreSQL
    TypeOrmModule.forFeature([
      User, Event, TicketType,
      Restaurant, Tour,
      Clan, ClanMember, ClanMessage, ClanCreationConfig,
      Artist, PlatformConfig, ModerationReport,
      BlogPost, Coupon,
      Ticket, Subscription, AdCampaign,
      Wallet, WalletTransaction,
      Verification,
      DeviceSession, PasswordReset,
      Notification, UserNotification, FcmToken,
      StripeCustomer, PaymentMethod, Payment,
      Theater, SeatingLayout, Seat, TheaterEvent, SeatReservation,
    ]),
    // MongoDB
    MongooseModule.forFeature([
      { name: ArtistProfile.name, schema: ArtistProfileSchema },
      { name: EventReview.name, schema: EventReviewSchema },
    ]),
  ],
  controllers: [
    HealthController, AuthController, EventsController,
    RestaurantsController, ToursController, ClansController,
    ArtistsController, ConfigController, ReviewsController,
    AdminUsersController, ModerationController, AdminEventsController,
    AdminRestaurantsController, AdminToursController,
    AdminBlogController, BlogController,
    AdminCouponsController, CouponsController,
    AdminTicketsController, TicketsController,
    AdminSubscriptionsController,
    AdminAdsController,
    AdminWalletsController, WalletController,
    AdminVerificationsController, VerificationsController,
    AdminNotificationsController, NotificationsController,
    PaymentsController, AdminPaymentsController,
    TheatersController, AdminTheatersController,
    UploadsController,
  ],
  providers: [
    AuthGatewayService, EventsGatewayService,
    RestaurantsGatewayService, ToursGatewayService,
    ClansGatewayService,
    ArtistsGatewayService, SpotifyService,
    ConfigGatewayService, ReviewsGatewayService,
    AdminUsersGatewayService, ModerationGatewayService, AdminEventsGatewayService,
    AdminRestaurantsGatewayService, AdminToursGatewayService,
    AdminBlogGatewayService, AdminCouponsGatewayService,
    TicketsGatewayService, SubscriptionsGatewayService,
    AdsGatewayService, WalletsGatewayService,
    VerificationsGatewayService,
    NotificationsGatewayService, FirebasePushService,
    TokenBlacklistService,
    EmailService,
    IpGeolocationService,
    StripeService, PaymentsGatewayService,
    TheatersGatewayService, SeatReservationService, SeatsGateway,
    UploadService,
  ],
})
export class AppModule {}
