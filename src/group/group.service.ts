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
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['groups']
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      return user;
    }


    private async findGroupWithUsers(groupId: number): Promise<Group> {
      const group = await this.groupRepo.findOne({
        where: { id: groupId },
        relations: ['users', 'owner']
      });
  
      if (!group) {
        throw new NotFoundException('Group not found');
      }
  
      return group;
    }
  
    
    
    async createGroup(name: string, visibility: 'public' | 'private', ownerId: number): Promise<Group> {
      const owner = await this.userRepo.findOne({ where: { id: ownerId } });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
  
      const group = this.groupRepo.create({ name, visibility, owner });
      await this.groupRepo.save(group);
  
      return group;
    }
  
    // async joinGroup(groupId: number, userId: number): Promise<Group> {
    //   const group = await this.findGroupWithUsers(groupId);
    //   const user = await this.findUserWithGroups(userId);
  
    //   if (group.visibility === 'private') {
    //     throw new ForbiddenException('Cannot directly join a private group');
    //   }
  
    //   if (!group.users.some(u => u.id === userId)) {
    //     group.users.push(user);
    //     await this.groupRepo.save(group);
    //   }
  
    //   return group;
    // }
    
    
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
        throw new BadRequestException('Join requests are only allowed for private groups');
      }
  
      const existingRequest = await this.joinRequestRepo.findOne({
        where: { group: { id: groupId }, user: { id: userId }, status: 'pending' }
      });
  
      if (existingRequest) {
        throw new BadRequestException('Join request already exists');
      }
  
      const joinRequest = this.joinRequestRepo.create({ group, user, status: 'pending' });
      await this.joinRequestRepo.save(joinRequest);
    }
    
  
    async getPublicGroups(): Promise<Group[]> {
      return this.groupRepo.find({
        where: { visibility: 'public' },
        relations: ['users', 'owner']
      });
    }
  
    async getPrivateGroups(): Promise<Group[]> {
      return this.groupRepo.find({ where: { visibility: 'private' },
        relations: ['users', 'owner']
      });
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
  
    async approveJoinRequest(requestId: number, approverId: number): Promise<Group> {
      return this.groupRepo.manager.transaction(async transactionalEntityManager => {
        // Fetch the join request with related group and user
        const joinRequest = await transactionalEntityManager.findOne(JoinRequest, {
          where: { id: requestId },
          relations: ['group', 'user'],
        });
    
        if (!joinRequest) {
          throw new NotFoundException('Join request not found');
        }
    
        // Fetch the group including its users and owner
        const group = await transactionalEntityManager.findOne(Group, {
          where: { id: joinRequest.group.id },
          relations: ['users', 'owner'],
        });
    
        if (!group) {
          throw new NotFoundException('Group not found');
        }
    
        // Check if the approver is the owner of the group
        if (group.owner.id !== approverId) {
          throw new ForbiddenException('Only the group owner can approve join requests');
        }
    
        // Check if the user already exists in the group
        const userExistsInGroup = group.users.some(u => u.id === joinRequest.user.id);
    
        console.log('Approving join request...');
        console.log('Group ID:', group.id);
        console.log('Group Name:', group.name);
        console.log('Group Owner ID:', group.owner.id);
        console.log('User ID:', joinRequest.user.id);
        console.log('User Full Name:', joinRequest.user.fullName);
    
        // If the user is not already in the group, add them
        if (!userExistsInGroup) {
          // Use the query builder to insert into the junction table
          await transactionalEntityManager
            .createQueryBuilder()
            .insert()
            .into('users_groups_group')
            .values({ usersId: joinRequest.user.id, groupId: group.id })
            .execute();
    
          console.log('User added to group successfully');
        }
    
        // Update the join request status to 'approved'
        joinRequest.status = 'approved';
    
        // Save the updated join request
        await transactionalEntityManager.save(joinRequest);
        console.log('Join request approved successfully');
    
        // Fetch the updated group
        const updatedGroup = await transactionalEntityManager.findOne(Group, {
          where: { id: group.id },
          relations: ['users', 'owner'],
        });
    
        return updatedGroup;
      });
    }
    
  
    async getAllGroups(): Promise<Group[]> {
        const groups = await this.groupRepo.find({
          relations: ['owner', 'users']
        });
        console.log('Fetched groups:', JSON.stringify(groups, null, 2));
        return groups;
      }
      async getJoinRequests(groupId: number, ownerId: number): Promise<JoinRequest[]> {
        const group = await this.findGroupWithUsers(groupId);
    
        if (group.owner.id !== ownerId) {
          throw new ForbiddenException('Only the group owner can view join requests');
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
    
    
  async declineJoinRequest(requestId: number, declinerId: number): Promise<void> {
    return this.groupRepo.manager.transaction(async transactionalEntityManager => {
      const joinRequest = await transactionalEntityManager.findOne(JoinRequest, {
        where: { id: requestId },
        relations: ['group', 'user'],
      });

      if (!joinRequest) {
        throw new NotFoundException('Join request not found');
      }

      const group = await transactionalEntityManager.findOne(Group, {
        where: { id: joinRequest.group.id },
        relations: ['owner'],
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      if (group.owner.id !== declinerId) {
        throw new ForbiddenException('Only the group owner can decline join requests');
      }

      joinRequest.status = 'rejected';
      await transactionalEntityManager.save(joinRequest);

      console.log('Join request declined successfully');
    });
  }

  }
  