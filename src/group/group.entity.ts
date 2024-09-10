import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../auth/user.entity';

@Entity('groups')
export class Group {

    constructor() {
        console.log('Group entity constructed');
      }
      

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User, user => user.createdGroups)
  creator: User;

  @ManyToMany(() => User, user => user.groups)
  @JoinTable()
  members: User[];
}