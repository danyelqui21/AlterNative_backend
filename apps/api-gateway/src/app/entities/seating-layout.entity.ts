import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Theater } from './theater.entity';
import { Seat } from './seat.entity';

@Entity('seating_layouts')
export class SeatingLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  theaterId: string;

  @ManyToOne(() => Theater, (theater) => theater.layouts)
  @JoinColumn({ name: 'theaterId' })
  theater: Theater;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int', default: 800 })
  canvasWidth: number;

  @Column({ type: 'int', default: 600 })
  canvasHeight: number;

  @Column({ nullable: true })
  backgroundUrl: string;

  @OneToMany(() => Seat, (seat) => seat.layout, {
    cascade: true,
    eager: false,
  })
  seats: Seat[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
