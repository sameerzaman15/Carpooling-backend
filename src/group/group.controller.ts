import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
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
    async getJoinRequests(
        @Param('id') groupId: number,
        @GetUser() user: any
    ) {
        console.log('User from @GetUser:', user);
        return this.groupService.getJoinRequests(groupId, user.userId);
    }

  
    
    
    
    
    
    
    

    @Post('request-join/:id')
    async requestToJoinPrivateGroup(@Param('id') groupId: number, @GetUser() user: any) {
        console.log('Request to join private group received');
        console.log('Group ID:', groupId);
        console.log('User from @GetUser:', JSON.stringify(user, null, 2));

        if (!user) {
            console.log('User object is null or undefined');
            throw new UnauthorizedException('User not authenticated');
        }

        if (!user.userId) {
            console.log('User object does not contain a userId property');
            console.log('Available properties on user object:', Object.keys(user));
            throw new UnauthorizedException('User ID not found');
        }

        try {
            const result = await this.groupService.requestToJoinPrivateGroup(groupId, user.userId);
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