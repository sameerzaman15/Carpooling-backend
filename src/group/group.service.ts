import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Group } from './group.entity';
import { User } from '../auth/user.entity';
import { UpdateGroupDto } from './update-user-dto';

@Injectable()
export class GroupService {
  constructor(
    
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>

  ) {}


  async createGroup(name: string, visibility: 'public' | 'private', userId: number): Promise<Group> {
    if (!name) {
      throw new Error('Group name is required');
    }

    const group = this.groupRepository.create({ name, visibility });
    const savedGroup = await this.groupRepository.save(group);
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['groups'] });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.groups.push(savedGroup);
    await this.userRepository.save(user);

    return savedGroup;
  }

  async joinGroup(groupId: number, userId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id: groupId }, relations: ['users'] });
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['groups'] });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (group.visibility === 'private') {
      throw new Error('Cannot join a private group directly');
    }

    group.users.push(user);
    user.groups.push(group);

    await this.groupRepository.save(group);
    await this.userRepository.save(user);

    return group;
  }
//   async getPublicGroups(): Promise<Group[]> {
//     return this.groupRepository.find({ where: { visibility: 'public' } });
//   }
  

  async getPublicGroups(): Promise<Group[]> {
    return this.groupRepository.find({ where: { visibility: 'public' } });
  }

  async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    if (!updateGroupDto || Object.keys(updateGroupDto).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const result = await this.groupRepository.update(id, updateGroupDto);

    if (result.affected === 0) {
      throw new BadRequestException('Group not found or no changes made');
    }

    const updatedGroup = await this.groupRepository.findOneBy({ id });
    if (!updatedGroup) {
      throw new BadRequestException('Group not found after update');
    }

    return updatedGroup;
  }

// async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
//     // Validate the input
//     if (!updateGroupDto || Object.keys(updateGroupDto).length === 0) {
//         throw new BadRequestException('No fields provided for update');
//     }

//     // Perform the update
//     const result = await this.groupRepository.update(id, updateGroupDto);

//     // Check if the update affected any rows
//     if (result.affected === 0) {
//         throw new BadRequestException('Group not found or no changes made');
//     }

//     // Fetch and return the updated group
//     const updatedGroup = await this.groupRepository.findOneBy({ id });
//     if (!updatedGroup) {
//         throw new BadRequestException('Group not found after update');
//     }

//     return updatedGroup;
// }

async getPrivateGroupsForUser(userId: number): Promise<Group[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.groups.filter(group => group.visibility === 'private');
  }


  async getGroupById(groupId: number, userId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.visibility === 'private' && !group.users.some(user => user.id === userId)) {
      throw new ForbiddenException('You do not have access to this private group');
    }

    return group;
  }

  async addUserToPrivateGroup(groupId: number, userId: number, adminId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.visibility !== 'private') {
      throw new Error('This operation is only allowed for private groups');
    }

    const admin = group.users.find(user => user.id === adminId);
    if (!admin) {
      throw new ForbiddenException('Only group members can add users to a private group');
    }

    const userToAdd = await this.userRepository.findOne({ where: { id: userId } });
    if (!userToAdd) {
      throw new NotFoundException('User to add not found');
    }

    if (!group.users.some(user => user.id === userToAdd.id)) {
      group.users.push(userToAdd);
      await this.groupRepository.save(group);
    }

    return group;
  }
  async getAllGroups(): Promise<Group[]> {
    return this.groupRepository.find();
  }

  async requestToJoinPrivateGroup(groupId: number, userId: number): Promise<void> {
    const group = await this.groupRepository.findOne({ where: { id: groupId }, relations: ['users'] });
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (group.visibility !== 'private') {
      throw new BadRequestException('This operation is only allowed for private groups');
    }

    // Here you would typically create a join request record in the database
    // For simplicity, we'll just log it
    console.log(`User ${userId} has requested to join private group ${groupId}`);
  }

  async approveJoinRequest(groupId: number, userId: number, approverId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id: groupId }, relations: ['users'] });
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['groups'] });
    const approver = await this.userRepository.findOne({ where: { id: approverId } });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    if (!group.users.some(groupUser => groupUser.id === approverId)) {
      throw new ForbiddenException('Only group members can approve join requests');
    }

    group.users.push(user);
    user.groups.push(group);

    await this.groupRepository.save(group);
    await this.userRepository.save(user);

    return group;
  }
}
