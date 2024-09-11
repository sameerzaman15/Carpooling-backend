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
  
    if (!Array.isArray(this.users)) {
      console.error('Expected an array of users but got:', this.users);
      return {
        id: this.id,
        name: this.name,
        visibility: this.visibility,
        users: [] // return empty array if users are not correctly fetched
      };
    }
  
    const userSet = new Set(
      this.users.map(user => {
        if (!user || !user.id || !user.fullName) {
          console.error('User is missing required properties:', user);
          return null;
        }
        console.log('Processing user:', user);
        return JSON.stringify({ id: user.id, fullName: user.fullName });
      }).filter(userString => userString !== null) // Filter out null values
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