import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Clan } from './clan.entity';

export enum ClanMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('clan_members')
@Unique(['clanId', 'userId'])
export class ClanMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clanId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ClanMemberRole, default: ClanMemberRole.MEMBER })
  role: ClanMemberRole;

  @ManyToOne(() => Clan, (clan) => clan.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @CreateDateColumn()
  joinedAt: Date;
}
