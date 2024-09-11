import { Controller, Post, Body, UseGuards, Get, Param, Patch, BadRequestException, Req, UnauthorizedException } from '@nestjs/common';
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
  async createGroup(@Body() body: { name: string; visibility: 'public' | 'private' }, @GetUser() user: User) {
    const { name, visibility } = body;
    if (!name) {
      throw new BadRequestException('Group name is required');
    }
    return this.groupService.createGroup(name, visibility, user.id);
  }

  @Post(':id/join')
  async joinGroup(@Param('id') groupId: number, @GetUser() user: any) {
    return this.groupService.joinGroup(groupId, user.userId);
  }
  

  @Get()
  async getAllGroups() {
    return this.groupService.getAllGroups();
  }

  @Get('public')
  async getPublicGroups() {
    return this.groupService.getPublicGroups();
  }

  @Get('private')
  async getPrivateGroups(@GetUser() user: User) {
    return this.groupService.getPrivateGroups();
  }
  
  @Get(':id')
  async getGroup(@Param('id') id: number, @GetUser() user: User) {
    console.log('User from @GetUser:', user);
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.groupService.getGroupById(id, user.id);
  }
  
  @Post('private/add-user')
  async addUserToPrivateGroup(
    @Body() body: { groupId: number; userId: number },
    @GetUser() admin: User
  ) {
    console.log('Admin from @GetUser:', admin);
    if (!admin || !admin.id) {
      throw new UnauthorizedException('Admin not authenticated');
    }
    return this.groupService.addUserToPrivateGroup(body.groupId, body.userId, admin.id);
  }
  
  @Post('request-join/:id')
  async requestToJoinPrivateGroup(@Param('id') groupId: number, @GetUser() user: any) {
    console.log('Request to join private group received');
    console.log('Group ID:', groupId);
    console.log('User from @GetUser:', user);
  
    if (!user || !user.sub) {
      console.log('User authentication failed');
      throw new UnauthorizedException('User not authenticated');
    }
  
    try {
      // Use user.sub as the userId, since that seems to be the user's ID in the token
      const result = await this.groupService.requestToJoinPrivateGroup(groupId, user.sub);
      console.log('Join request processed successfully');
      return result;
    } catch (error) {
      console.error('Error processing join request:', error);
      throw error;
    }
  }
  @Post('approve-join/:groupId/:userId')
  async approveJoinRequest(
    @Param('groupId') groupId: number,
    @Param('userId') userId: number,
    @GetUser() approver: User
  ) {
    return this.groupService.approveJoinRequest(groupId, userId, approver.id);
  }
}