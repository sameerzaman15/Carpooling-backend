import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { User } from 'src/auth/user.entity';
import { JwtAuthGuard } from 'src/jwt/jwt.auth-guard';
import { GetUser } from '../auth/get-user.decorator';
import { GroupService } from './group.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}

  // Create a new group
  @Post('create')
  async createGroup(@Body() body: { name: string; visibility: 'public' | 'private' }, @GetUser() user: any) {
    if (!body.name) throw new BadRequestException('Group name is required');
    return this.groupService.createGroup(body.name, body.visibility, user.userId);
  }

  // Join an existing group
  @Post(':id/join')
  async joinGroup(@Param('id') groupId: number, @GetUser() user: any) {
    return this.groupService.joinGroup(groupId, user.userId);
  }

  // Get all groups
  @Get()
  async getAllGroups() {
    return this.groupService.getAllGroups();
  }

  // Get all public groups
  @Get('public')
  async getPublicGroups() {
    return this.groupService.getPublicGroups();
  }

  // Get all private groups
  @Get('private')
  async getPrivateGroups() {
    return this.groupService.getPrivateGroups();
  }

  // Get join requests for groups owned by the user
  @Get('my-join-requests')
  async getMyJoinRequests(@GetUser() user: any) {
    return this.groupService.getJoinRequestsForOwner(user.userId);
  }

  // Get a specific group by ID
  @Get(':id')
  async getGroup(@Param('id') id: number, @GetUser() user: any) {
    if (!user || !user.userId) throw new UnauthorizedException('User not authenticated');
    return this.groupService.getGroupById(id, user.userId);
  }

  // Add a user to a private group
  @Post('private/add-user')
  async addUserToPrivateGroup(@Body() body: { groupId: number; userId: number }, @GetUser() admin: User) {
    if (!admin || !admin.id) throw new UnauthorizedException('Admin not authenticated');
    return this.groupService.addUserToPrivateGroup(body.groupId, body.userId, admin.id);
  }

  // Get join requests for a specific group
  @Get(':id/join-requests')
  async getJoinRequests(@Param('id') groupId: number, @GetUser() user: any) {
    return this.groupService.getJoinRequests(groupId, user.userId);
  }

  // Approve a join request
  @Post('join-requests/:requestId/approve')
  async approveJoinRequest(@Param('requestId') requestId: number, @GetUser() user: any) {
    return this.groupService.approveJoinRequest(requestId, user.userId);
  }

  // Request to join a private group
  @Post(':id/request-join')
  async requestToJoinPrivateGroup(@Param('id') groupId: number, @GetUser() user: any) {
    await this.groupService.createJoinRequest(groupId, user.userId);
    return { message: 'Join request sent successfully' };
  }

  // Decline a join request
  @Post('join-requests/:requestId/decline')
  async declineJoinRequest(@Param('requestId') requestId: number, @GetUser() user: any) {
    await this.groupService.declineJoinRequest(requestId, user.userId);
    return { message: 'Join request declined successfully' };
  }

  // Delete a group
  @Delete(':id')
  async deleteGroup(@Param('id') groupId: number, @GetUser() user: any) {
    await this.groupService.deleteGroup(groupId, user.userId);
    return { message: 'Group deleted successfully' };
  }

  // Update a group's name
  @Patch(':id/update-name')
  async updateGroupName(@Param('id') groupId: number, @Body('name') newName: string, @GetUser() user: any) {
    if (!newName || newName.trim() === '') throw new BadRequestException('New group name is required');
    return this.groupService.updateGroupName(groupId, newName, user.userId);
  }

  // Leave a group
  @Post(':id/leave')
  async leaveGroup(@Param('id') groupId: number, @GetUser() user: any) {
    await this.groupService.leaveGroup(groupId, user.userId);
    return { message: 'Successfully left the group' };
  }

  // Remove a user from a group
  @Delete(':groupId/users/:userId')
  async removeUserFromGroup(@Param('groupId') groupId: number, @Param('userId') userIdToRemove: number, @GetUser() user: any) {
    await this.groupService.removeUserFromGroup(groupId, userIdToRemove, user.userId);
    return { message: 'User successfully removed from the group' };
  }
}