import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Clan } from './clan.entity';

export enum ClanMessageType {
  TEXT = 'text',
  EVENT_SHARE = 'event_share',
  TICKET_PURCHASE = 'ticket_purchase',
}

@Entity('clan_messages')
export class ClanMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clanId: string;

  @Column('uuid')
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: ClanMessageType, default: ClanMessageType.TEXT })
  type: ClanMessageType;

  @Column({ type: 'uuid', nullable: true })
  eventId: string;

  @ManyToOne(() => Clan, (clan) => clan.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @CreateDateColumn()
  createdAt: Date;
}
