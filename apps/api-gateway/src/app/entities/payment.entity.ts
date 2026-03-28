import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'mxn' })
  currency: string;

  @Column({ default: 'pending' })
  status: string; // pending, succeeded, failed, refunded

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  referenceType: string; // ticket, topup, reservation

  @Column({ type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
