import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'both' })
  type: string; // dialog, push, both

  @Column({ default: 'normal' })
  priority: string; // normal, high, critical

  @Column({ default: 'all' })
  targetType: string; // all, role, user, app

  @Column({ nullable: true })
  targetValue: string; // role name, comma-separated user IDs

  @Column({ type: 'json', nullable: true })
  targetApps: string[]; // ['app.user', 'app.web', ...]

  @Column({ nullable: true })
  actionUrl: string;

  @Column({ nullable: true })
  actionLabel: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
