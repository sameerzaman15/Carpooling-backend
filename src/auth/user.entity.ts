import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToMany, JoinColumn, ManyToOne, JoinTable } from 'typeorm';
import { Group } from '../group/group.entity';
import { Auth } from './auth.entity';
import { JoinRequest } from 'src/group/join-requst-entity';

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

  @OneToMany(() => Group, group => group.owner)
  createdGroups: Group[];

  @ManyToMany(() => Group, group => group.users)
  @JoinTable()
  groups: Group[]; // Remove the array initialization

  @OneToMany(() => JoinRequest, joinRequest => joinRequest.user)
  joinRequests: JoinRequest[];



  toJSON() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      phoneNo: this.phoneNo,
      groups: this.groups ? this.groups.map(group => ({ id: group.id, name: group.name })) : []
    };
  }

  // @ManyToMany(() => Group, group => group.members)
  // groups: Group[];

//   @OneToMany(() => JoinRequest, joinRequest => joinRequest.user)
// joinRequests: JoinRequest[];

}