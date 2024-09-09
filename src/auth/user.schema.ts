import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsString()
  @IsNotEmpty()
  username: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @Column({ unique: true, nullable:true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column({ unique: true, nullable: true })
  @IsOptional()
  @IsString()
  googleId?: string;
}
