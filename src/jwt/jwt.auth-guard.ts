import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    console.log('Authorization Header:', authorizationHeader);

    if (!authorizationHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authorizationHeader.split(' ')[1]?.trim();
    console.log('Extracted Token:', token);

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const decoded = await this.authService.verifyToken(token);
      console.log('Decoded Token Payload:', decoded);
      request.user = decoded;
      return !!decoded;
    } catch (err) {
      console.error('Token Verification Error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
