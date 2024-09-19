import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { User } from 'src/auth/user.entity';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { GetUser } from '../auth/get-user.decorator';
import { GroupService } from './group.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
    constructor(private groupService: GroupService) { }



    @UseGuards(JwtAuthGuard)

    @Post('create')
    async createGroup(@Body() body: { name: string; visibility: 'public' | 'private' }, @GetUser() user: any) {
      const { name, visibility } = body;
      if (!name) {
        throw new BadRequestException('Group name is required');
      }
      return this.groupService.createGroup(name, visibility, user.userId);
    }

    
    @Post(':id/join')
    async joinGroup(@Param('id') groupId: number, @GetUser() user: any) {
      return this.groupService.joinGroup(groupId, user.userId);
    }
  


    @Get()
    async getAllGroups() {
      console.log('Fetching all groups');
      const groups = await this.groupService.getAllGroups();
      console.log('Groups fetched:', JSON.stringify(groups, null, 2));
      return groups;
    }

    @Get('public')
    async getPublicGroups() {
        return this.groupService.getPublicGroups();
    }

    @Get('private')
    async getPrivateGroups(@GetUser() user: User) {
        return this.groupService.getPrivateGroups();
    }
    @Get('my-join-requests')
    async getMyJoinRequests(@GetUser() user: any) {
        console.log('Fetching join requests for user:', user.userId);
        return this.groupService.getJoinRequestsForOwner(user.userId);
    }

    @Get(':id')
    async getGroup(@Param('id') id: number, @GetUser() user: any) {
        console.log('User from @GetUser:', user);
        if (!user || !user.userId) {
            throw new UnauthorizedException('User not authenticated');
        }
        return this.groupService.getGroupById(id, user.userId);
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

    

    @Get(':id/join-requests')
    async getJoinRequests(@Param('id') groupId: number, @GetUser() user: any) {
      return this.groupService.getJoinRequests(groupId, user.userId);
    }

    @Post('join-requests/:requestId/approve')
    async approveJoinRequest(@Param('requestId') requestId: number, @GetUser() user: any) {
      return this.groupService.approveJoinRequest(requestId, user.userId);
    }


    @Post(':id/request-join')
    async requestToJoinPrivateGroup(@Param('id') groupId: number, @GetUser() user: any) {
      await this.groupService.createJoinRequest(groupId, user.userId);
      return { message: 'Join request sent successfully' };
    }

    @Post('join-requests/:requestId/decline')
    async declineJoinRequest(@Param('requestId') requestId: number, @GetUser() user: any) {
      await this.groupService.declineJoinRequest(requestId, user.userId);
      return { message: 'Join request declined successfully' };
    }

    
    @Delete(':id')
    async deleteGroup(@Param('id') groupId: number, @GetUser() user: any) {
      await this.groupService.deleteGroup(groupId, user.userId);
      return { message: 'Group deleted successfully' };
    }

    @Patch(':id/update-name')
    async updateGroupName(
      @Param('id') groupId: number,
      @Body('name') newName: string,
      @GetUser() user: any
    ) {
      if (!newName || newName.trim() === '') {
        throw new BadRequestException('New group name is required');
      }
  
      return this.groupService.updateGroupName(groupId, newName, user.userId);
    }
  

}