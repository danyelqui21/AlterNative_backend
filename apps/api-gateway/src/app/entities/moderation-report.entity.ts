import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('moderation_reports')
export class ModerationReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'comment', 'chat', 'user', 'restaurant', 'review', 'event'

  @Column('uuid')
  targetId: string;

  @Column({ nullable: true })
  targetName: string;

  @Column('uuid')
  reporterId: string;

  @Column({ nullable: true })
  reporterName: string;

  @Column()
  reason: string;

  @Column({ nullable: true, type: 'text' })
  details: string;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'reviewed', 'resolved', 'dismissed'

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ nullable: true, type: 'text' })
  resolution: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
