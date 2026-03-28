import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserRole,
} from '../../../../../auth-service/src/app/entities/user.entity';

@Injectable()
export class AdminUsersGatewayService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(filters: {
    role?: string;
    isActive?: string;
    isVerified?: string;
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('user');

    if (filters.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters.isActive !== undefined) {
      const isActive = filters.isActive === 'true';
      qb.andWhere('user.isActive = :isActive', { isActive });
    }
    if (filters.isVerified !== undefined) {
      const isVerified = filters.isVerified === 'true';
      qb.andWhere('user.isVerified = :isVerified', { isVerified });
    }
    if (filters.city) {
      qb.andWhere('user.city = :city', { city: filters.city });
    }
    if (filters.search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async update(id: string, dto: Record<string, unknown>) {
    const user = await this.findOne(id);

    const allowedFields = ['name', 'phone', 'city', 'role', 'interests'];
    for (const key of Object.keys(dto)) {
      if (allowedFields.includes(key)) {
        (user as any)[key] = dto[key];
      }
    }

    if (dto.role) {
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(dto.role as UserRole)) {
        throw new BadRequestException(`Rol invalido: ${dto.role}`);
      }
    }

    return this.userRepo.save(user);
  }

  async enable(id: string) {
    const user = await this.findOne(id);
    user.isActive = true;
    return this.userRepo.save(user);
  }

  async disable(id: string) {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.userRepo.save(user);
  }

  async verify(id: string) {
    const user = await this.findOne(id);
    user.isVerified = true;
    return this.userRepo.save(user);
  }

  async changeRole(id: string, role: string) {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestException(`Rol invalido: ${role}`);
    }

    const user = await this.findOne(id);
    user.role = role as UserRole;
    return this.userRepo.save(user);
  }
}
