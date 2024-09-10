import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

//   async createGroup(createGroupDto: { name: string; description?: string }, creator: User) {
//     console.log('Creating group with data:', JSON.stringify(createGroupDto));
//     console.log('Creator:', JSON.stringify(creator));

//     if (!createGroupDto.name) {
//         throw new BadRequestException('Group name is required');
//     }

//     const group = this.groupRepository.create({
//         name: createGroupDto.name,
//         description: createGroupDto.description,
//         creator: creator,
//         members: [creator],
//     });

//     console.log('Group entity constructed:', JSON.stringify(group));

//     try {
//         // Attempt to save the group
//         const savedGroup = await this.groupRepository.save(group);
//         console.log('Group saved:', JSON.stringify(savedGroup));
        
//         return savedGroup;
//     } catch (error) {
//         console.error('Error saving group:', error);
//         if (error instanceof QueryFailedError) {
//             console.error('SQL Error:', error.query, error.parameters);
//         }
//         throw new InternalServerErrorException('Failed to create group: ' + error.message);
//     }
// }

  
async createGroup(name: string, userId: number): Promise<Group> {

    if (!name) {
        throw new Error('Group name is required');
      }

    const group = this.groupRepository.create({ name });
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

    group.users.push(user);
    user.groups.push(group);

    await this.groupRepository.save(group);
    await this.userRepository.save(user);

    return group;
  }
  
  

//   async getUserGroups(user: User) {
//     return this.groupRepository.find({
//       where: [
//         { creator: { id: user.id } },
//         { members: { id: user.id } },
//       ],
//       relations: ['creator', 'members'],
//     });
//   }

//   async getGroupDetails(id: number) {
//     const group = await this.groupRepository.findOne({
//       where: { id },
//       relations: ['creator', 'members'],
//     });
//     if (!group) {
//       throw new NotFoundException('Group not found');
//     }
//     return group;
//   }


async updateGroup(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    // Validate the input
    if (!updateGroupDto || Object.keys(updateGroupDto).length === 0) {
        throw new BadRequestException('No fields provided for update');
    }

    // Perform the update
    const result = await this.groupRepository.update(id, updateGroupDto);

    // Check if the update affected any rows
    if (result.affected === 0) {
        throw new BadRequestException('Group not found or no changes made');
    }

    // Fetch and return the updated group
    const updatedGroup = await this.groupRepository.findOneBy({ id });
    if (!updatedGroup) {
        throw new BadRequestException('Group not found after update');
    }

    return updatedGroup;
}
}
