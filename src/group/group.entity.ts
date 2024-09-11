import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
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

  toJSON() {
    console.log('Group toJSON called. Users:', this.users);
    const userSet = new Set(
      (this.users || []).map(user => {
        console.log('Processing user:', user);
        return JSON.stringify({ id: user.id, fullName: user.fullName });
      })
    );
    const result = {
      id: this.id,
      name: this.name,
      visibility: this.visibility,
      users: Array.from(userSet).map(userString => JSON.parse(userString))
    };
    console.log('Group toJSON result:', result);
    return result;
  }
}