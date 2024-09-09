import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { GoogleStrategy } from './google.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { Auth } from './auth.entity';
import { User } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Auth]), // Register the User entity with TypeORM
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, GoogleStrategy],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
