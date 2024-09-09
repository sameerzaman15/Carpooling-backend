import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UserDetailsService } from './user.details.service';

@Controller('user-details')
export class UserDetailsController {
  constructor(private readonly userDetailsService: UserDetailsService) {}

  @Get(':id')
  async getUserDetails(@Param('id', ParseIntPipe) id: number) {
    return this.userDetailsService.getUserDetailsById(id);
  }
}
