import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdCampaign } from '../entities/ad-campaign.entity';

const VALID_PLACEMENTS = ['banner', 'promo', 'featured', 'popup'];
const VALID_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'];

@Injectable()
export class AdsGatewayService {
  constructor(
    @InjectRepository(AdCampaign)
    private readonly adRepo: Repository<AdCampaign>,
  ) {}

  async findAll(filters: {
    status?: string;
    placement?: string;
    advertiserId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.adRepo
      .createQueryBuilder('ad')
      .where('ad.isActive = :isActive', { isActive: true });

    if (filters.status) {
      qb.andWhere('ad.status = :status', { status: filters.status });
    }
    if (filters.placement) {
      qb.andWhere('ad.placement = :placement', {
        placement: filters.placement,
      });
    }
    if (filters.advertiserId) {
      qb.andWhere('ad.advertiserId = :advertiserId', {
        advertiserId: filters.advertiserId,
      });
    }
    if (filters.search) {
      qb.andWhere(
        '(ad.title ILIKE :search OR ad.advertiserName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('ad.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const ad = await this.adRepo.findOne({
      where: { id, isActive: true },
    });
    if (!ad) {
      throw new NotFoundException('Campana publicitaria no encontrada');
    }
    return ad;
  }

  async create(dto: Record<string, unknown>) {
    if (!dto.title) {
      throw new BadRequestException('title es requerido');
    }
    if (!dto.description) {
      throw new BadRequestException('description es requerido');
    }
    if (!dto.targetUrl) {
      throw new BadRequestException('targetUrl es requerido');
    }
    if (dto.placement && !VALID_PLACEMENTS.includes(dto.placement as string)) {
      throw new BadRequestException(
        `Placement invalido. Opciones: ${VALID_PLACEMENTS.join(', ')}`,
      );
    }

    const ad = this.adRepo.create({
      ...dto,
      status: 'draft',
    } as Partial<AdCampaign>);

    return this.adRepo.save(ad);
  }

  async update(id: string, dto: Record<string, unknown>) {
    const ad = await this.findOne(id);
    if (dto.placement && !VALID_PLACEMENTS.includes(dto.placement as string)) {
      throw new BadRequestException(
        `Placement invalido. Opciones: ${VALID_PLACEMENTS.join(', ')}`,
      );
    }
    Object.assign(ad, dto);
    return this.adRepo.save(ad);
  }

  async activate(id: string) {
    const ad = await this.findOne(id);
    ad.status = 'active';
    return this.adRepo.save(ad);
  }

  async pause(id: string) {
    const ad = await this.findOne(id);
    ad.status = 'paused';
    return this.adRepo.save(ad);
  }

  async cancel(id: string) {
    const ad = await this.findOne(id);
    ad.status = 'cancelled';
    return this.adRepo.save(ad);
  }

  async stats() {
    const total = await this.adRepo.count({ where: { isActive: true } });
    const active = await this.adRepo.count({
      where: { status: 'active', isActive: true },
    });

    const raw = await this.adRepo
      .createQueryBuilder('ad')
      .select('COALESCE(SUM(ad.budget), 0)', 'totalBudget')
      .addSelect('COALESCE(SUM(ad.spent), 0)', 'totalSpent')
      .addSelect('COALESCE(SUM(ad.impressions), 0)', 'totalImpressions')
      .addSelect('COALESCE(SUM(ad.clicks), 0)', 'totalClicks')
      .where('ad.isActive = :isActive', { isActive: true })
      .getRawOne();

    return {
      total,
      active,
      totalBudget: Number(raw.totalBudget),
      totalSpent: Number(raw.totalSpent),
      totalImpressions: Number(raw.totalImpressions),
      totalClicks: Number(raw.totalClicks),
    };
  }
}
