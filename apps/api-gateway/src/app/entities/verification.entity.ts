import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verifications')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column()
  type: string; // identity, organizer, restaurant

  @Column({ type: 'json', nullable: true })
  documents: string[]; // URLs to uploaded documents

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: 'pending' })
  status: string; // pending, in_review, approved, rejected

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
