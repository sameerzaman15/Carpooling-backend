import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Auth } from './auth.entity';

@Entity('users')
export class User {
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
  auth: Auth;
}