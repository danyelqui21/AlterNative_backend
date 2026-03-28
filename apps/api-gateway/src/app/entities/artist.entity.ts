import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('artists')
export class Artist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  bio: string;

  @Column()
  city: string;

  @Column({ type: 'json', nullable: true })
  genres: string[];

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  spotifyArtistId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
