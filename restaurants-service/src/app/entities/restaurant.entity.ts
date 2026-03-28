import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  cuisineType: string;

  @Column({ type: 'int', default: 2 })
  priceRange: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false })
  isOpenNow: boolean;

  @Column({ default: false })
  hasPromos: boolean;

  @Column({ type: 'json', nullable: true })
  deliveryPlatforms: string[];

  @Column({ default: 'free' })
  subscriptionTier: string;

  @Column({ default: false })
  hasLiveChat: boolean;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
