import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@lagunapp-backend/database';
import { AuthModule } from '@lagunapp-backend/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Clan } from './entities/clan.entity';
import { ClanMember } from './entities/clan-member.entity';
import { ClanMessage } from './entities/clan-message.entity';
import { ClanCreationConfig } from './entities/clan-creation-config.entity';
// User entity is loaded via autoLoadEntities from the shared database
// For standalone build, we reference it from auth-service
import { User } from '../../../auth-service/src/app/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRoot(),
    AuthModule,
    TypeOrmModule.forFeature([Clan, ClanMember, ClanMessage, ClanCreationConfig, User]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
