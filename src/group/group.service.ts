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

  // Helper to find a user by ID with groups relation
  private async findUserWithGroups(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['groups'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Helper to find a group by ID with users relation

  

  // Create group and associate user with it
  async createGroup(name: string, visibility: 'public' | 'private', ownerId: number): Promise<Group> {
    console.log(`Creating group with name: ${name}, visibility: ${visibility}, ownerId: ${ownerId}`);

    const owner = await this.findUserWithGroups(ownerId);
    console.log('Owner found:', owner);

    
    const group = this.groupRepo.create({ name, visibility, owner });
    await this.groupRepo.save(group);
    
    // Optional: add the owner to the group
    if (!owner.groups.some(g => g.id === group.id)) {
      owner.groups.push(group);
      await this.userRepo.save(owner);
    }
    
    return group;
  }
  
  
  
    
  
  
  async findGroupWithUsers(groupId: number): Promise<Group | null> {
    
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['users', 'owner'],
    });
  
    console.log('Full group data:', JSON.stringify(group, null, 2));
    return group;
  }
  // Join group logic, handling visibility and membership
  async joinGroup(groupId: number, userId: number): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['users'] });
    const user = await this.findUserWithGroups(userId);
  
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    if (!group.users.some(u => u.id === userId)) {
      group.users.push(user);
      await this.groupRepo.save(group);
    }
  
    return group;
  }
  
  
  
  
  
  async createJoinRequest(group: Group, user: User): Promise<void> {
    const existingRequest = await this.joinRequestRepo.findOne({
      where: { group: { id: group.id }, user: { id: user.id }, status: 'pending' }
    });
  
    if (!existingRequest) {
      const joinRequest = this.joinRequestRepo.create({ group, user, status: 'pending' });
      await this.joinRequestRepo.save(joinRequest);
    }
  }

  // Fetch public groups
  async getPublicGroups(): Promise<Group[]> {
    return this.groupRepo.find({ where: { visibility: 'public' ,} });
  }

  // Fetch private groups
  async getPrivateGroups(): Promise<Group[]> {
    return this.groupRepo.find({ where: { visibility: 'private' } });
  }

  // Update group with DTO
  async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const result = await this.groupRepo.update(id, updateGroupDto);
    if (result.affected === 0) throw new BadRequestException('Group not found or no changes made');
    
    return await this.groupRepo.findOneBy({ id })
  }

  async getGroupById(groupId: number, userId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
  
    if (group.visibility === 'private') {
      const user = await this.findUserWithGroups(userId);
      if (!user.groups.some(g => g.id === groupId)) {
        throw new ForbiddenException('Access denied to private group');
      }
    }
  
    return group;
  }
  
  

  // Add user to private group by admin
  async addUserToPrivateGroup(groupId: number, userId: number, adminId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
    const userToAdd = await this.findUserWithGroups(userId);
  
    if (!userToAdd) throw new NotFoundException('User not found');
    if (!group.users.some(user => user.id === adminId)) throw new ForbiddenException('Only group members can add users');
  
    if (!group.users.some(user => user.id === userId)) {
      group.users.push(userToAdd);
      await this.groupRepo.save(group);
    }
  
    return group;
  }
  

  // Request to join a private group
  async requestToJoinPrivateGroup(groupId: number, userId: number): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    const user = await this.findUserWithGroups(userId);
  
    if (!group) throw new NotFoundException(`Group with ID ${groupId} not found`);
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
  
    if (group.visibility !== 'private') {
      throw new BadRequestException('Only private groups require join requests');
    }
  
    const existingRequest = await this.joinRequestRepo.findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (existingRequest) {
      throw new BadRequestException('Join request already exists');
    }
  
    const joinRequest = this.joinRequestRepo.create({ group, user });
    await this.joinRequestRepo.save(joinRequest);
  }
  
  

  // Approve user join request by group member
  async approveJoinRequest(groupId: number, requestId: number, approverId: number): Promise<Group> {
    const group = await this.findGroupWithUsers(groupId);
    const joinRequest = await this.joinRequestRepo.findOne({
      where: { id: requestId },
      relations: ['user'],
    });
  
    if (!joinRequest) throw new NotFoundException('Join request not found');
    if (!group.users.some(user => user.id === approverId)) throw new ForbiddenException('Only group members can approve requests');
  
    group.users.push(joinRequest.user);
    await this.groupRepo.save(group);
  
    await this.joinRequestRepo.remove(joinRequest);
  
    return group;
  }
  
  

  // Fetch all groups
  async getAllGroups(): Promise<Group[]> {
    return this.groupRepo.find();
  }
  async getJoinRequests(groupId: number, requestingUserId: number): Promise<JoinRequest[]> {
    const group = await this.findGroupWithUsers(groupId);
  
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
  
    const isUserMemberOrOwner = group.users.some(user => user.id === requestingUserId) || group.owner?.id === requestingUserId;
  
    if (!isUserMemberOrOwner) {
      throw new ForbiddenException('Only group members or the owner can view join requests');
    }
  
    // Fetch pending join requests for the group
    const joinRequests = await this.joinRequestRepo.find({
      where: { group: { id: groupId }, status: 'pending' },
      relations: ['user'],
    });
  
    return joinRequests;
  }
  
  
  

  
  

  
}
