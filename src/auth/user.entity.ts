import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToMany, JoinColumn } from 'typeorm';
import { Group } from '../group/group.entity';
import { Auth } from './auth.entity';

@Entity('users')
export class User {
    constructor() {
    console.log('User entity constructed');
  }
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phoneNo: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  googleId: string;

  @OneToOne(() => Auth, auth => auth.user)
  @JoinColumn()
  auth: Auth;

  @ManyToMany(() => Group, group => group.users)
  groups: Group[];

  // @ManyToMany(() => Group, group => group.members)
  // groups: Group[];

//   @OneToMany(() => JoinRequest, joinRequest => joinRequest.user)
// joinRequests: JoinRequest[];

}