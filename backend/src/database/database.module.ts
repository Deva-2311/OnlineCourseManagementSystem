import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        autoLoadEntities: true,
        // Disable synchronize to enforce migration-based schema integrity
        synchronize: false,
        logging: configService.get<string>('env') === 'development',
        // In a real production setup, SSL might be required:
        // ssl: configService.get<string>('env') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
