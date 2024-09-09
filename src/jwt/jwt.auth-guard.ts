import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log(request.headers);
    
    const token = request.headers.authorization?.split(' ')[1]?.replace(/^"|"$/g, '');

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const decoded = await this.authService.verifyToken(token);
      
      request.user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
