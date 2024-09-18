import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../auth/user.entity';
import { JoinRequest } from './join-requst-entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  visibility: 'public' | 'private';

  @ManyToOne(() => User, user => user.createdGroups, { eager: true })
  owner: User;

  @ManyToMany(() => User, user => user.groups, { cascade: true })
  @JoinTable()
  users: User[];

  @OneToMany(() => JoinRequest, joinRequest => joinRequest.group)
  joinRequests: JoinRequest[];

  toJSON() {
    try {
      // console.log('Group toJSON called. Group:', this);
      // console.log('Group toJSON - Owner:', this.owner);
      // console.log('Group toJSON - Users:', this.users);

      const usersArray = Array.isArray(this.users) ? this.users : [];

      const result = {
        id: this.id,
        name: this.name,
        visibility: this.visibility,
        owner: this.owner ? {
          id: this.owner.id,
          fullName: this.owner.fullName,
        } : null,
        users: usersArray.map(user => ({
          id: user.id,
          fullName: user.fullName,
        })),
      };

      console.log('Group toJSON result:', result);
      return result;
    } catch (error) {
      console.error('Error in Group toJSON:', error);
      return null;
    }
  }
}
