import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('seat_reservations')
@Unique(['theaterEventId', 'seatId'])
export class SeatReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  theaterEventId: string;

  @Column('uuid')
  seatId: string;

  @Column('uuid')
  ticketId: string;

  @Column('uuid')
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
