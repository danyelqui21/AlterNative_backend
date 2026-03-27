import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get('POSTGRES_HOST', 'localhost'),
            port: config.get<number>('POSTGRES_PORT', 5432),
            username: config.get('POSTGRES_USER', 'lagunapp'),
            password: config.get('POSTGRES_PASSWORD', 'lagunapp_dev_2026'),
            database: config.get('POSTGRES_DB', 'lagunapp_db'),
            autoLoadEntities: true,
            synchronize:
              config.get('NODE_ENV', 'development') === 'development',
          }),
        }),
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            uri: config.get(
              'MONGO_URI',
              'mongodb://lagunapp:lagunapp_dev_2026@localhost:27017/lagunapp?authSource=admin'
            ),
          }),
        }),
      ],
      exports: [TypeOrmModule, MongooseModule],
      global: true,
    };
  }
}
