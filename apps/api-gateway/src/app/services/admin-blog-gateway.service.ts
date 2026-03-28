import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from '../entities/blog-post.entity';

@Injectable()
export class AdminBlogGatewayService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repo: Repository<BlogPost>,
  ) {}

  async findAll(filters: {
    status?: string;
    authorId?: string;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('b');

    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.authorId) {
      qb.andWhere('b.authorId = :authorId', { authorId: filters.authorId });
    }
    if (filters.tag) {
      qb.andWhere('b.tags ::jsonb @> :tag', { tag: JSON.stringify([filters.tag]) });
    }
    if (filters.search) {
      qb.andWhere('b.title ILIKE :search', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post no encontrado');
    return post;
  }

  async create(data: Partial<BlogPost>) {
    if (!data.title) throw new BadRequestException('El título es requerido');
    if (!data.content) throw new BadRequestException('El contenido es requerido');

    const post = this.repo.create(data);
    return this.repo.save(post);
  }

  async update(id: string, data: Partial<BlogPost>) {
    const post = await this.findOne(id);
    Object.assign(post, data);
    return this.repo.save(post);
  }

  async publish(id: string) {
    const post = await this.findOne(id);
    post.status = 'published';
    post.publishedAt = new Date();
    return this.repo.save(post);
  }

  async archive(id: string) {
    const post = await this.findOne(id);
    post.status = 'archived';
    return this.repo.save(post);
  }

  async draft(id: string) {
    const post = await this.findOne(id);
    post.status = 'draft';
    return this.repo.save(post);
  }

  async findPublished(filters: { page?: number; limit?: number }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: 'published' })
      .andWhere('b.isActive = :isActive', { isActive: true })
      .orderBy('b.publishedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findPublishedOne(id: string) {
    const post = await this.repo.findOne({
      where: { id, status: 'published', isActive: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');
    return post;
  }
}
