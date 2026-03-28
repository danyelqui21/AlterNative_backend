import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verification } from '../entities/verification.entity';
import { User } from '../../../../../auth-service/src/app/entities/user.entity';

const VALID_TYPES = ['identity', 'organizer', 'restaurant'];
const VALID_STATUSES = ['pending', 'in_review', 'approved', 'rejected'];

@Injectable()
export class VerificationsGatewayService {
  constructor(
    @InjectRepository(Verification)
    private readonly verRepo: Repository<Verification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Admin ──

  async findAll(filters: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.verRepo
      .createQueryBuilder('ver')
      .where('ver.isActive = :isActive', { isActive: true });

    if (filters.type) {
      qb.andWhere('ver.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('ver.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(ver.userName ILIKE :search OR ver.userId::text ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('ver.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const ver = await this.verRepo.findOne({
      where: { id, isActive: true },
    });
    if (!ver) {
      throw new NotFoundException('Verificacion no encontrada');
    }
    return ver;
  }

  async approve(id: string, reviewerId: string) {
    const ver = await this.findOne(id);
    ver.status = 'approved';
    ver.reviewedBy = reviewerId;
    await this.verRepo.save(ver);

    // Set user.isVerified = true
    await this.userRepo.update(ver.userId, { isVerified: true });

    return ver;
  }

  async reject(
    id: string,
    reviewerId: string,
    dto: { rejectionReason: string },
  ) {
    if (!dto.rejectionReason) {
      throw new BadRequestException('rejectionReason es requerido');
    }
    const ver = await this.findOne(id);
    ver.status = 'rejected';
    ver.reviewedBy = reviewerId;
    ver.rejectionReason = dto.rejectionReason;
    return this.verRepo.save(ver);
  }

  async setInReview(id: string) {
    const ver = await this.findOne(id);
    ver.status = 'in_review';
    return this.verRepo.save(ver);
  }

  async stats() {
    const pending = await this.verRepo.count({
      where: { status: 'pending', isActive: true },
    });
    const inReview = await this.verRepo.count({
      where: { status: 'in_review', isActive: true },
    });
    const approved = await this.verRepo.count({
      where: { status: 'approved', isActive: true },
    });
    const rejected = await this.verRepo.count({
      where: { status: 'rejected', isActive: true },
    });

    const byTypeRaw = await this.verRepo
      .createQueryBuilder('ver')
      .select('ver.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('ver.isActive = :isActive', { isActive: true })
      .groupBy('ver.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    for (const row of byTypeRaw) {
      byType[row.type] = Number(row.count);
    }

    return { pending, inReview, approved, rejected, byType };
  }

  // ── Public ──

  async submit(
    userId: string,
    dto: { type: string; documents?: string[]; notes?: string },
  ) {
    if (!dto.type || !VALID_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `type invalido. Opciones: ${VALID_TYPES.join(', ')}`,
      );
    }

    // Fetch user name
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userName = user?.name || null;

    const ver = this.verRepo.create({
      userId,
      userName,
      type: dto.type,
      documents: dto.documents || [],
      notes: dto.notes || null,
      status: 'pending',
    });

    return this.verRepo.save(ver);
  }

  async findMy(userId: string) {
    return this.verRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
