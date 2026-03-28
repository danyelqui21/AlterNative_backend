import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  excerpt: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  authorId: string;

  @Column({ nullable: true })
  authorName: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true, type: 'timestamp' })
  publishedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
