import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SeatingMode {
  NUMBERED = 'numbered',
  GENERAL = 'general',
}

@Entity('theater_events')
export class TheaterEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  eventId: string;

  @Column('uuid')
  theaterId: string;

  @Column({ type: 'uuid', nullable: true })
  layoutId: string;

  @Column({
    type: 'enum',
    enum: SeatingMode,
    default: SeatingMode.GENERAL,
  })
  seatingMode: SeatingMode;

  /**
   * Frozen snapshot of seats at event creation time.
   * Layout edits after this point do NOT affect this event's seat map.
   * Contains the full seat array as JSON so past events are immutable.
   */
  @Column({ type: 'jsonb', nullable: true })
  seatsSnapshot: any[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
