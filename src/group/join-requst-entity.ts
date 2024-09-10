// import { User } from "src/auth/user.entity";
// import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
// import { Group } from "./group.entity";

// @Entity()
// export class JoinRequest {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   userId: number;

//   @Column()
//   groupId: number;

//   @Column({ default: 'pending' }) // 'pending', 'approved', 'rejected'
//   status: 'pending' | 'approved' | 'rejected';

//   @ManyToOne(() => User, user => user.joinRequests)
//   user: User;

//   @ManyToOne(() => Group, group => group.joinRequests)
//   group: Group;
// }
