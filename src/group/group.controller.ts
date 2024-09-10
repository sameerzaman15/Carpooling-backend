import { Controller, Post, Body, UseGuards, Get, Param, Patch, BadRequestException } from '@nestjs/common';
import { GroupService } from './group.service';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { User } from 'src/auth/user.entity';
import { UpdateGroupDto } from './update-user-dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  async createGroup(
    @Body() createGroupDto: { name: string; description?: string },
    @GetUser() user: User
  ) {
    console.log('Received create group request:', JSON.stringify(createGroupDto));
    console.log('User:', JSON.stringify(user));
    return this.groupService.createGroup(createGroupDto, user);
  }

  @Get()
  getUserGroups(@GetUser() user: User) {
    return this.groupService.getUserGroups(user);
  }

  @Get(':id')
  getGroupDetails(@Param('id') id: number) {
    return this.groupService.getGroupDetails(id);
  }

  @Patch(':id')
  async updateGroup(
      @Param('id') id: number,
      @Body() updateGroupDto: UpdateGroupDto
  ) {
      console.log('Update request received:', updateGroupDto);
  
      if (!updateGroupDto || Object.keys(updateGroupDto).length === 0) {
          throw new BadRequestException('No fields provided for update');
      }
  
      return this.groupService.updateGroup(id, updateGroupDto);
  }

}