import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SeatingLayout } from './seating-layout.entity';

@Entity('theaters')
export class Theater {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  phone: string;

  @Column('uuid')
  managerId: string;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @OneToMany(() => SeatingLayout, (layout) => layout.theater, {
    cascade: true,
    eager: false,
  })
  layouts: SeatingLayout[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
