import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationReport } from '../entities/moderation-report.entity';

@Injectable()
export class ModerationGatewayService {
  constructor(
    @InjectRepository(ModerationReport)
    private readonly reportRepo: Repository<ModerationReport>,
  ) {}

  async findAll(filters: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.reportRepo
      .createQueryBuilder('report')
      .where('report.isActive = :isActive', { isActive: true });

    if (filters.type) {
      const validTypes = ['comment', 'chat', 'user', 'restaurant', 'review', 'event'];
      if (!validTypes.includes(filters.type)) {
        throw new BadRequestException(`Tipo invalido: ${filters.type}`);
      }
      qb.andWhere('report.type = :type', { type: filters.type });
    }
    if (filters.status) {
      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      if (!validStatuses.includes(filters.status)) {
        throw new BadRequestException(`Estado invalido: ${filters.status}`);
      }
      qb.andWhere('report.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(report.targetName ILIKE :search OR report.reporterName ILIKE :search OR report.reason ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('report.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id, isActive: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }

  async create(dto: {
    type: string;
    targetId: string;
    targetName?: string;
    reason: string;
    details?: string;
  }, reporterId: string, reporterName?: string) {
    const validTypes = ['comment', 'chat', 'user', 'restaurant', 'review', 'event'];
    if (!validTypes.includes(dto.type)) {
      throw new BadRequestException(`Tipo invalido: ${dto.type}`);
    }
    if (!dto.targetId) {
      throw new BadRequestException('targetId es requerido');
    }
    if (!dto.reason) {
      throw new BadRequestException('reason es requerido');
    }

    const report = this.reportRepo.create({
      type: dto.type,
      targetId: dto.targetId,
      targetName: dto.targetName || null,
      reporterId,
      reporterName: reporterName || null,
      reason: dto.reason,
      details: dto.details || null,
      status: 'pending',
    });

    return this.reportRepo.save(report);
  }

  async review(id: string, reviewedBy: string, resolution?: string) {
    const report = await this.findOne(id);
    report.status = 'reviewed';
    report.reviewedBy = reviewedBy;
    if (resolution) {
      report.resolution = resolution;
    }
    return this.reportRepo.save(report);
  }

  async resolve(id: string, reviewedBy: string, resolution?: string) {
    const report = await this.findOne(id);
    report.status = 'resolved';
    report.reviewedBy = reviewedBy;
    if (resolution) {
      report.resolution = resolution;
    }
    return this.reportRepo.save(report);
  }

  async dismiss(id: string, reviewedBy: string, resolution?: string) {
    const report = await this.findOne(id);
    report.status = 'dismissed';
    report.reviewedBy = reviewedBy;
    if (resolution) {
      report.resolution = resolution;
    }
    return this.reportRepo.save(report);
  }

  async getStats() {
    const reports = await this.reportRepo
      .createQueryBuilder('report')
      .where('report.isActive = :isActive', { isActive: true })
      .getMany();

    const byStatus: Record<string, number> = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };
    const byType: Record<string, number> = {};

    for (const report of reports) {
      byStatus[report.status] = (byStatus[report.status] || 0) + 1;
      byType[report.type] = (byType[report.type] || 0) + 1;
    }

    return {
      total: reports.length,
      ...byStatus,
      byType,
    };
  }
}
