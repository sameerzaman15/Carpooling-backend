import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
  } from '@nestjs/common';
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
  
    private async findUserWithGroups(userId: number): Promise<User> {
      console.log('Fetching user with ID:', userId); // Log the user ID being requested
    
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['groups']
      });
    
      if (!user) {
        console.log('User not found with ID:', userId); // If no user found, log this
        throw new NotFoundException('User not found');
      }
    
      console.log('User found:', JSON.stringify(user, null, 2)); // Log the entire user object
      return user;
    }
    
  
    // private async findGroupWithUsers(groupId: number): Promise<Group> {
    //   const group = await this.groupRepo.findOne({
    //     where: { id: groupId },
    //     relations: ['users', 'owner']
    //   });
    //   console.log('Loaded Group:', group);

    //   if (!group) throw new NotFoundException('Group not found');
    //   return group;
    // }

    async findGroupWithUsers(groupId: number) {
      try {
        console.log('Fetching group with ID:', groupId); // Check the group ID being requested
    
        const group = await this.groupRepo.findOne({ 
          where: { id: groupId }, 
          relations: ['users', 'owner'] 
        });
    
        if (!group) {
          console.log('Group not found for ID:', groupId); // If no group found, log this
          throw new NotFoundException('Group not found');
        }
    
        console.log('Group found:', JSON.stringify(group, null, 2)); // Log the entire group object
        return group;
      } catch (error) {
        console.error('Error finding group:', error); // Log any error that occurs
        throw new InternalServerErrorException('Error finding group');
      }
    }
    
    
    async createGroup(name: string, visibility: 'public' | 'private', ownerId: number): Promise<Group> {
      console.log('Creating group. Name:', name, 'Visibility:', visibility, 'Owner ID:', ownerId); // Log the inputs
    
      const owner = await this.userRepo.findOne({ 
        where: { id: ownerId },
        relations: ['groups']
      });
    
      if (!owner) {
        console.log('Owner not found for ID:', ownerId); // Log if the owner is not found
        throw new NotFoundException('Owner not found');
      }
    
      console.log('Owner found:', JSON.stringify(owner, null, 2)); // Log the owner object
    
      const group = this.groupRepo.create({ name, visibility, owner });
      await this.groupRepo.save(group);
    
      console.log('Group saved:', JSON.stringify(group, null, 2)); // Log the newly saved group
    
      if (!owner.groups) {
        owner.groups = [];
      }
    
      if (!owner.groups.some(g => g.id === group.id)) {
        owner.groups.push(group);
        await this.userRepo.save(owner);
        console.log('Updated owner with new group:', JSON.stringify(owner, null, 2)); // Log updated owner
      }
    
      return group;
    }
    
    
    async joinGroup(groupId: number, userId: number): Promise<Group> {
      console.log('Joining group. Group ID:', groupId, 'User ID:', userId);
    
      return this.groupRepo.manager.transaction(async transactionalEntityManager => {
        const group = await transactionalEntityManager.findOne(Group, {
          where: { id: groupId },
          relations: ['users', 'owner']
        });
    
        if (!group) {
          console.log('Group not found:', groupId);
          throw new NotFoundException('Group not found');
        }
    
        const user = await transactionalEntityManager.findOne(User, {
          where: { id: userId }
        });
    
        if (!user) {
          console.log('User not found:', userId);
          throw new NotFoundException('User not found');
        }
    
        console.log('Group before joining:', JSON.stringify(group, null, 2));
        console.log('User attempting to join:', JSON.stringify(user, null, 2));
    
        if (!group.users.some(u => u.id === userId)) {
          // Directly insert into the junction table
          await transactionalEntityManager.query(
            `INSERT INTO users_groups_group ("usersId", "groupId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, groupId]
          );
    
          console.log('User added to group');
        } else {
          console.log('User already in group');
        }
    
        // Fetch the updated group
        const updatedGroup = await transactionalEntityManager.findOne(Group, {
          where: { id: groupId },
          relations: ['users', 'owner']
        });
    
        console.log('Updated group:', JSON.stringify(updatedGroup, null, 2));
    
        return updatedGroup;
      });
    }
    
  
    async createJoinRequest(groupId: number, userId: number): Promise<void> {
      const group = await this.findGroupWithUsers(groupId);
      const user = await this.findUserWithGroups(userId);
    
      if (group.visibility !== 'private') {
        console.log('Join requests are only allowed for private groups');
        throw new BadRequestException('Join requests are only for private groups');
      }
    
      const existingRequest = await this.joinRequestRepo.findOne({
        where: { group: { id: groupId }, user: { id: userId }, status: 'pending' }
      });
    
      if (existingRequest) {
        console.log('Join request already exists for user:', userId);
        throw new BadRequestException('Join request already exists');
      }
    
      const joinRequest = this.joinRequestRepo.create({ group, user, status: 'pending' });
      await this.joinRequestRepo.save(joinRequest);
    
      console.log('Join request created for user:', userId, 'Group ID:', groupId);
    }
    
  
    async getPublicGroups(): Promise<Group[]> {
      return this.groupRepo.find({ where: { visibility: 'public' } });
    }
  
    async getPrivateGroups(): Promise<Group[]> {
      return this.groupRepo.find({ where: { visibility: 'private' } });
    }
  
    async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
      const result = await this.groupRepo.update(id, updateGroupDto);
      if (result.affected === 0) throw new BadRequestException('Group not found or no changes made');
      return await this.groupRepo.findOne({ where: { id } });
    }
  
    async getGroupById(groupId: number, userId: number): Promise<Group> {
      const group = await this.findGroupWithUsers(groupId);
    
      if (group.visibility === 'private') {
        const user = await this.findUserWithGroups(userId);
        if (!user.groups.some(g => g.id === groupId)) {
          console.log(`User ${userId} is not a member of the private group ${groupId}`);
          throw new ForbiddenException('Access denied to private group');
        }
      }
    
      return group;
    }
  
    async addUserToPrivateGroup(groupId: number, userId: number, adminId: number): Promise<Group> {
      const group = await this.findGroupWithUsers(groupId);
      const userToAdd = await this.findUserWithGroups(userId);
  
      if (!group.users.some(user => user.id === adminId)) {
        throw new ForbiddenException('Only group members can add users');
      }
  
      if (!group.users.some(user => user.id === userId)) {
        group.users.push(userToAdd);
        await this.groupRepo.save(group);
      }
  
      return group;
    }
  
    async requestToJoinPrivateGroup(groupId: number, userId: number): Promise<void> {
      const group = await this.findGroupWithUsers(groupId);
      const user = await this.findUserWithGroups(userId);
  
      if (group.visibility !== 'private') {
        throw new BadRequestException('Only private groups require join requests');
      }
  
      const existingRequest = await this.joinRequestRepo.findOne({
        where: { group: { id: groupId }, user: { id: userId } }
      });
  
      if (existingRequest) {
        throw new BadRequestException('Join request already exists');
      }
  
      const joinRequest = this.joinRequestRepo.create({ group, user });
      await this.joinRequestRepo.save(joinRequest);
    }
  
    async approveJoinRequest(groupId: number, requestId: number, approverId: number): Promise<Group> {
      const group = await this.findGroupWithUsers(groupId);
      const joinRequest = await this.joinRequestRepo.findOne({
        where: { id: requestId },
        relations: ['user']
      });
  
      if (!joinRequest) throw new NotFoundException('Join request not found');
      if (!group.users.some(user => user.id === approverId)) throw new ForbiddenException('Only group members can approve requests');
  
      group.users.push(joinRequest.user);
      await this.groupRepo.save(group);
      await this.joinRequestRepo.remove(joinRequest);
  
      return group;
    }
  
    async getAllGroups(): Promise<Group[]> {
        const groups = await this.groupRepo.find({
          relations: ['owner', 'users']
        });
        console.log('Fetched groups:', JSON.stringify(groups, null, 2));
        return groups;
      }
      async getJoinRequests(groupId: number, requestingUserId: number): Promise<JoinRequest[]> {
        const group = await this.findGroupWithUsers(groupId);
      
        if (group.owner.id !== requestingUserId && !group.users.some(user => user.id === requestingUserId)) {
          throw new ForbiddenException('Only group members or the owner can view join requests');
        }
      
        return this.joinRequestRepo.find({
          where: { group: { id: groupId }, status: 'pending' },
          relations: ['user'] 
        });
      }

      async getJoinRequestsForOwner(ownerId: number): Promise<JoinRequest[]> {
        const groups = await this.groupRepo.find({
            where: { owner: { id: ownerId } },
            relations: ['joinRequests', 'joinRequests.user']
        });
    
        return groups.flatMap(group => group.joinRequests);
    }

    async getGroupWithUsersAndOwner(groupId: number): Promise<Group> {
      try {
        const group = await this.groupRepo.findOne({
          where: { id: groupId },
          relations: ['users', 'owner'], // Ensure relationships are loaded
        });
    
        if (!group) {
          throw new NotFoundException('Group not found');
        }
    
        return group;
      } catch (error) {
        console.error('Error fetching group:', error);
        throw new InternalServerErrorException('Error fetching group');
      }
    }
    
  }
  