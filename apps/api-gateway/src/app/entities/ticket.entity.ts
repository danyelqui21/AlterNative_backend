import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  ticketTypeId: string | null;

  @Column()
  eventTitle: string;

  @Column()
  ticketTypeName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ default: 'active' })
  status: string; // active, used, cancelled, refunded

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'uuid', nullable: true })
  seatId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
