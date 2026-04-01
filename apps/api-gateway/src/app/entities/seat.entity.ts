import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SeatingLayout } from './seating-layout.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  layoutId: string;

  @ManyToOne(() => SeatingLayout, (layout) => layout.seats)
  @JoinColumn({ name: 'layoutId' })
  layout: SeatingLayout;

  @Column()
  label: string;

  @Column({ nullable: true })
  sectionName: string;

  @Column({ nullable: true })
  rowName: string;

  @Column({ type: 'int', nullable: true })
  seatNumber: number;

  @Column({ type: 'float' })
  posX: number;

  @Column({ type: 'float' })
  posY: number;

  @Column({ type: 'float', default: 0 })
  angle: number;

  @Column({ default: '#D4663F' })
  color: string;

  @Column({ nullable: true })
  backgroundColor: string;

  @Column({ default: 'standard' })
  seatType: string; // standard, vip, wheelchair, premium

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
