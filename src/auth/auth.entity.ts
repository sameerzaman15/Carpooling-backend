import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  password: string;

  @OneToOne(() => User, user => user.auth, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}