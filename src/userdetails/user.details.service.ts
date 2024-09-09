import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/user.entity';
import { Repository } from 'typeorm';


@Injectable()
export class UserDetailsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUserDetailsById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['fullName', 'phoneNo'], 
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      fullName: user.fullName,
      phoneNo: user.phoneNo,
    };
  }
}
