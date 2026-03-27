import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ClanMember } from './clan-member.entity';
import { ClanMessage } from './clan-message.entity';

@Entity('clans')
export class Clan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  city: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('uuid')
  creatorId: string;

  @Column({ type: 'int', default: 10 })
  maxMembers: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ClanMember, (m) => m.clan, { cascade: true })
  members: ClanMember[];

  @OneToMany(() => ClanMessage, (m) => m.clan)
  messages: ClanMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
