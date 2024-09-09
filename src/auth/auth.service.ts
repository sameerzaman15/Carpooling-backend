import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth } from './auth.entity';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async signup(signupDto: { username: string; password: string; fullName: string; phoneNo: string }) {
    const { username, password, fullName, phoneNo } = signupDto;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const auth = this.authRepository.create({ username, password: hashedPassword });
    const savedAuth = await this.authRepository.save(auth);
    
    const users = this.userRepository.create({ fullName, phoneNo, auth: savedAuth });
    await this.userRepository.save(users);
    
    return { message: 'User created successfully' };
  }

  async login(loginDto: { username: string; password: string }) {
    const { username, password } = loginDto;
    const auth = await this.authRepository.findOne({ where: { username }, relations: ['user'] });

    if (!auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, auth.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      
      username: auth.username, 
      sub: auth.id,
      userId: auth.user.id
    };

    return {
      access_token: this.jwtService.sign(payload),
      userId: auth.user.id,
      message: 'Login successful, Token Verified'
      
    };
  }

  async verifyToken(token: string): Promise<any> {
    const cleanedToken = token.replace(/^"|"$/g, '');
    return this.jwtService.verifyAsync(cleanedToken);
  }

  async changePassword(username: string, currentPassword: string, newPassword: string) {
    const auth = await this.authRepository.findOne({ where: { username } });
    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, auth.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 6);
    auth.password = hashedNewPassword;
    await this.authRepository.save(auth);
    return { message: 'Password changed successfully' };
  }

  async findOrCreateUser(googleProfile: any): Promise<User> {
    const { email, firstName, lastName } = googleProfile;

    let auth = await this.authRepository.findOne({ 
      where: { user: { email } }, 
      relations: ['user'] 
    });
    let user = auth ? auth.user : null;

    if (!user) {
      const username = email.split('@')[0];
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const auth = this.authRepository.create({ username, password: hashedPassword });
      const savedAuth = await this.authRepository.save(auth);

      user = this.userRepository.create({
        fullName: `${firstName} ${lastName}`,
        email,
        googleId: googleProfile.id,
        auth: savedAuth
      });

      await this.userRepository.save(user);
      console.log(user);
    }

    return user;
  }

  async googleLogin(req, res) {
    if (!req.user) {
      return 'No user from google';
    }
  
    const user = req.user;
    const payload = { 
      email: user.email,
      userId: user.id,
      fullName: user.fullName,
      phoneNo: user.phoneNo
    };
  
    const token = this.jwtService.sign(payload);
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/#/login-success?token=${token}&userId=${user.id}`);
  }
}
