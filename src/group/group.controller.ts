import { Controller, Post, Body, UseGuards, Get, Param, Patch, BadRequestException, Req } from '@nestjs/common';
import { GroupService } from './group.service';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { User } from 'src/auth/user.entity';
import { UpdateGroupDto } from './update-user-dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}



@UseGuards(JwtAuthGuard)

@Post('create')
async createGroup(@Body() body: { name: string; visibility: 'public' | 'private'; userId: number }) {
  const { name, visibility, userId } = body;
  if (!name) {
    throw new Error('Group name is required');
  }
  return this.groupService.createGroup(name, visibility, userId);
}

@Post('join')
async joinGroup(@Body() body: { groupId: number; userId: number }) {
  const { groupId, userId } = body;
  return this.groupService.joinGroup(groupId, userId);
}

@Get('public')
async getPublicGroups() {
  return this.groupService.getPublicGroups();
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