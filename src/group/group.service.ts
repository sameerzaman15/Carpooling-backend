import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { User } from '../auth/user.entity';
import { UpdateGroupDto } from './update-user-dto';
import { JoinRequest } from './join-requst-entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(JoinRequest) private joinRequestRepo: Repository<JoinRequest>
  ) {}

  // Find user with groups
  private async findUserWithGroups(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['groups'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Find group with users and owner
  private async findGroupWithUsers(groupId: number): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['users', 'owner'] });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  // Create a new group
  async createGroup(name: string, visibility: 'public' | 'private', ownerId: number): Promise<Group> {
    const owner = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');
    const group = this.groupRepo.create({ name, visibility, owner });
    return this.groupRepo.save(group);
  }

  // Join a group
  async joinGroup(groupId: number, userId: number): Promise<Group> {
    return this.groupRepo.manager.transaction(async manager => {
      const group = await manager.findOne(Group, { where: { id: groupId }, relations: ['users', 'owner'] });
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!group || !user) throw new NotFoundException('Group or User not found');
      if (!group.users.some(u => u.id === userId)) {
        await manager.query('INSERT INTO users_groups_group ("usersId", "groupId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, groupId]);
      }
      return manager.findOne(Group, { where: { id: groupId }, relations: ['users', 'owner'] });
    });
  }

  // Create a join request
  async createJoinRequest(groupId: number, userId: number): Promise<void> {
    const group = await this.findGroupWithUsers(groupId);
    const user = await this.findUserWithGroups(userId);
    if (group.visibility !== 'private') throw new BadRequestException('Join requests are only allowed for private groups');
    const existingRequest = await this.joinRequestRepo.findOne({ where: { group: { id: groupId }, user: { id: userId }, status: 'pending' } });
    if (existingRequest) throw new BadRequestException('Join request already exists');
    const joinRequest = this.joinRequestRepo.create({ group, user, status: 'pending' });
    await this.joinRequestRepo.save(joinRequest);
  }

  // Get public groups
  async getPublicGroups(): Promise<Group[]> {
    return this.groupRepo.find({ where: { visibility: 'public' }, relations: ['users', 'owner'] });
  }

  // Get private groups
  async getPrivateGroups(): Promise<Group[]> {
    return this.groupRepo.find({ where: { visibility: 'private' }, relations: ['users', 'owner'] });
  }

  // Update group
  async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const result = await this.groupRepo.update(id, updateGroupDto);
    if (result.affected === 0) throw new BadRequestException('Group not found or no changes made');
    return this.groupRepo.findOne({ where: { id } });
  }

  // Get group by ID
  async getGroupById(groupId: number, userId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
    if (group.visibility === 'private') {
      const user = await this.findUserWithGroups(userId);
      if (!user.groups.some(g => g.id === groupId)) throw new ForbiddenException('Access denied to private group');
    }
    return group;
  }

  // Add user to private group
  async addUserToPrivateGroup(groupId: number, userId: number, adminId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
    const userToAdd = await this.findUserWithGroups(userId);
    if (!group.users.some(user => user.id === adminId)) throw new ForbiddenException('Only group members can add users');
    if (!group.users.some(user => user.id === userId)) {
      group.users.push(userToAdd);
      await this.groupRepo.save(group);
    }
    return group;
  }

  // Get all groups
  async getAllGroups(): Promise<Group[]> {
    return this.groupRepo.find({ relations: ['owner', 'users'] });
  }

  // Get join requests
  async getJoinRequests(groupId: number, ownerId: number): Promise<JoinRequest[]> {
    const group = await this.findGroupWithUsers(groupId);
    if (group.owner.id !== ownerId) throw new ForbiddenException('Only the group owner can view join requests');
    return this.joinRequestRepo.find({ where: { group: { id: groupId }, status: 'pending' }, relations: ['user'] });
  }

  // Get join requests for owner
  async getJoinRequestsForOwner(ownerId: number): Promise<JoinRequest[]> {
    const groups = await this.groupRepo.find({ where: { owner: { id: ownerId } }, relations: ['joinRequests', 'joinRequests.user'] });
    return groups.flatMap(group => group.joinRequests);
  }

  // Approve join request
  async approveJoinRequest(requestId: number, approverId: number): Promise<Group> {
    return this.groupRepo.manager.transaction(async manager => {
      const joinRequest = await manager.findOne(JoinRequest, { where: { id: requestId }, relations: ['group', 'user'] });
      if (!joinRequest) throw new NotFoundException('Join request not found');
      const group = await manager.findOne(Group, { where: { id: joinRequest.group.id }, relations: ['users', 'owner'] });
      if (!group) throw new NotFoundException('Group not found');
      if (group.owner.id !== approverId) throw new ForbiddenException('Only the group owner can approve join requests');
      if (!group.users.some(u => u.id === joinRequest.user.id)) {
        await manager.createQueryBuilder().insert().into('users_groups_group').values({ usersId: joinRequest.user.id, groupId: group.id }).execute();
      }
      joinRequest.status = 'approved';
      await manager.save(joinRequest);
      return manager.findOne(Group, { where: { id: group.id }, relations: ['users', 'owner'] });
    });
  }

  // Decline join request
  async declineJoinRequest(requestId: number, declinerId: number): Promise<void> {
    return this.groupRepo.manager.transaction(async manager => {
      const joinRequest = await manager.findOne(JoinRequest, { where: { id: requestId }, relations: ['group', 'user'] });
      if (!joinRequest) throw new NotFoundException('Join request not found');
      const group = await manager.findOne(Group, { where: { id: joinRequest.group.id }, relations: ['owner'] });
      if (!group) throw new NotFoundException('Group not found');
      if (group.owner.id !== declinerId) throw new ForbiddenException('Only the group owner can decline join requests');
      joinRequest.status = 'rejected';
      await manager.save(joinRequest);
    });
  }

  // Delete group
  async deleteGroup(groupId: number, userId: number): Promise<void> {
    return this.groupRepo.manager.transaction(async manager => {
      const group = await this.findGroupWithUsers(groupId);
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!group.owner) throw new InternalServerErrorException('Group owner information is missing');
      if (group.owner.id !== userId && user.role !== 'admin') throw new ForbiddenException('You do not have permission to delete this group');
      await manager.createQueryBuilder().delete().from(JoinRequest).where("groupId = :groupId", { groupId }).execute();
      await manager.createQueryBuilder().delete().from('users_groups_group').where("groupId = :groupId", { groupId }).execute();
      await manager.remove(group);
    });
  }

  // Update group name
  async updateGroupName(groupId: number, newName: string, userId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
    if (group.visibility === 'private' && group.owner.id !== userId) throw new ForbiddenException('Only the owner can update a private group\'s name');
    group.name = newName;
    return this.groupRepo.save(group);
  }

  // Leave group
  async leaveGroup(groupId: number, userId: number): Promise<void> {
    return this.groupRepo.manager.transaction(async manager => {
      const group = await this.findGroupWithUsers(groupId);
      const user = await this.findUserWithGroups(userId);
      if (!group.users.some(u => u.id === userId)) throw new BadRequestException('User is not a member of this group');
      if (group.owner.id === userId) throw new ForbiddenException('The owner cannot leave the group. Transfer ownership or delete the group instead.');
      group.users = group.users.filter(u => u.id !== userId);
      await manager.createQueryBuilder().delete().from('users_groups_group').where("usersId = :userId AND groupId = :groupId", { userId, groupId }).execute();
      await manager.save(group);
    });
  }

  // Remove user from group
  async removeUserFromGroup(groupId: number, userIdToRemove: number, ownerId: number): Promise<void> {
    return this.groupRepo.manager.transaction(async manager => {
      const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['owner'] });
      if (!group) throw new NotFoundException('Group not found');
      if (group.owner.id !== ownerId) throw new ForbiddenException('Only the group owner can remove users');
      if (group.owner.id === userIdToRemove) throw new BadRequestException('The owner cannot be removed from the group');
      const userGroupAssociation = await manager.createQueryBuilder().select("*").from('users_groups_group', 'ug').where("ug.usersId = :userId AND ug.groupId = :groupId", { userId: userIdToRemove, groupId }).getRawOne();
      if (!userGroupAssociation) throw new BadRequestException('User is not a member of this group');
      await manager.createQueryBuilder().delete().from('users_groups_group').where("usersId = :userId AND groupId = :groupId", { userId: userIdToRemove, groupId }).execute();
    });
  }
}