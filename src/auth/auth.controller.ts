import { Controller, Post, Body, UseGuards, Get, Req, Patch, Res} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { CustomRequest } from './custom-request.interface';
import { AuthGuard } from '@nestjs/passport';



@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: { username: string; password: string, fullName: string , phoneNo:string}) {
        console.log('Received signup request', signupDto); 
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: CustomRequest) {
    console.log('User from request:', req.user);
    return {
      username: req.user.username,
      fullName: req.user.fullName,
      phoneNo: req.user.phoneNo
    };
  }
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Req() req: CustomRequest,
    @Body() changePasswordDto: { currentPassword: string; newPassword: string }
  ) {
    const userId = req.user.username; 
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res() res) {
    return this.authService.googleLogin(req, res);
  }

}

