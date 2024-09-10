// src/group/group.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from '../auth/user.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  visibility: 'public' | 'private';


  @ManyToMany(() => User, user => user.groups)
  @JoinTable()
  users: User[];

//   @OneToMany(() => JoinRequest, joinRequest => joinRequest.group)
// joinRequests: JoinRequest[];
}
