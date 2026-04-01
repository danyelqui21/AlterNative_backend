import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  RESTAURANT = 'restaurant',
  ORGANIZER = 'organizer',
  SCANNER_STAFF = 'scanner_staff',
  THEATER_MANAGER = 'theater_manager',
  THEATER_SUBMANAGER = 'theater_submanager',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  DISCORD = 'discord',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true, unique: true })
  username: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  phoneCountryCode: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'json', nullable: true })
  interests: string[];

  @Column({ default: false })
  canCreateClans: boolean;

  @Column({ default: false })
  hasCompletedOnboarding: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
