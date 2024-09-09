import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Auth } from './auth/auth.entity';
import { User } from './auth/user.entity';
import { UserDetailsController } from './userdetails/user.details.controller';
import { UserDetailsService } from './userdetails/user.details.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        entities: [User, Auth],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TypeOrmModule.forFeature([User]), 
  ],
  controllers: [UserDetailsController], 
  providers: [UserDetailsService], 
})
export class AppModule {}
