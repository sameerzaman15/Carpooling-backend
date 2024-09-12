// import { User } from "src/auth/user.entity";
// import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
// import { Group } from "./group.entity";

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Group } from "./group.entity";
import { User } from "src/auth/user.entity";

@Entity()
export class JoinRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group, group => group.joinRequests)
  group: Group;

  @ManyToOne(() => User, user => user.joinRequests)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 'pending' })
  status: string;
}
