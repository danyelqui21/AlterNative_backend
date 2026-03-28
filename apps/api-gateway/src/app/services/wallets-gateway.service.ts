import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletTransaction } from '../entities/wallet.entity';

@Injectable()
export class WalletsGatewayService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  // ── Admin ──

  async findAll(filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.walletRepo
      .createQueryBuilder('wallet')
      .where('wallet.isActive = :isActive', { isActive: true });

    if (filters.status) {
      qb.andWhere('wallet.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere('wallet.userId::text ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('wallet.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const wallet = await this.walletRepo.findOne({
      where: { id, isActive: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet no encontrada');
    }

    const transactions = await this.txRepo.find({
      where: { walletId: id, isActive: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return { ...wallet, transactions };
  }

  async adjust(
    id: string,
    dto: { amount: number; type: string; description?: string },
  ) {
    const wallet = await this.walletRepo.findOne({
      where: { id, isActive: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet no encontrada');
    }

    if (!dto.amount || dto.amount === 0) {
      throw new BadRequestException('amount es requerido y debe ser diferente de 0');
    }
    if (!dto.type) {
      throw new BadRequestException('type es requerido');
    }

    const validTypes = ['credit', 'debit', 'refund', 'topup'];
    if (!validTypes.includes(dto.type)) {
      throw new BadRequestException(
        `type invalido. Opciones: ${validTypes.join(', ')}`,
      );
    }

    if (['debit'].includes(dto.type) && dto.amount > 0) {
      // For debit, ensure sufficient balance
      if (Number(wallet.balance) < dto.amount) {
        throw new BadRequestException('Saldo insuficiente');
      }
      wallet.balance = Number(wallet.balance) - dto.amount;
    } else {
      wallet.balance = Number(wallet.balance) + Math.abs(dto.amount);
    }

    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: id,
      type: dto.type,
      amount: dto.amount,
      description: dto.description || `Admin adjustment: ${dto.type}`,
    });
    await this.txRepo.save(tx);

    return { wallet, transaction: tx };
  }

  async freeze(id: string) {
    const wallet = await this.walletRepo.findOne({
      where: { id, isActive: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet no encontrada');
    }
    wallet.status = 'frozen';
    return this.walletRepo.save(wallet);
  }

  async unfreeze(id: string) {
    const wallet = await this.walletRepo.findOne({
      where: { id, isActive: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet no encontrada');
    }
    wallet.status = 'active';
    return this.walletRepo.save(wallet);
  }

  async stats() {
    const totalWallets = await this.walletRepo.count({
      where: { isActive: true },
    });
    const activeWallets = await this.walletRepo.count({
      where: { status: 'active', isActive: true },
    });
    const frozen = await this.walletRepo.count({
      where: { status: 'frozen', isActive: true },
    });

    const { totalBalance } = await this.walletRepo
      .createQueryBuilder('wallet')
      .select('COALESCE(SUM(wallet.balance), 0)', 'totalBalance')
      .where('wallet.isActive = :isActive', { isActive: true })
      .getRawOne();

    return {
      totalWallets,
      totalBalance: Number(totalBalance),
      frozen,
      activeWallets,
    };
  }

  // ── Public ──

  async findMyWallet(userId: string) {
    let wallet = await this.walletRepo.findOne({
      where: { userId, isActive: true },
    });

    if (!wallet) {
      // Auto-create wallet for user
      wallet = this.walletRepo.create({
        userId,
        balance: 0,
        status: 'active',
      });
      wallet = await this.walletRepo.save(wallet);
    }

    const transactions = await this.txRepo.find({
      where: { walletId: wallet.id, isActive: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return { ...wallet, transactions };
  }

  async topup(userId: string, dto: { amount: number }) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('amount debe ser mayor a 0');
    }

    let wallet = await this.walletRepo.findOne({
      where: { userId, isActive: true },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        balance: 0,
        status: 'active',
      });
      wallet = await this.walletRepo.save(wallet);
    }

    if (wallet.status === 'frozen') {
      throw new BadRequestException('Wallet congelada. No se pueden realizar operaciones');
    }

    wallet.balance = Number(wallet.balance) + dto.amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: 'topup',
      amount: dto.amount,
      description: 'Recarga de saldo',
    });
    await this.txRepo.save(tx);

    return { wallet, transaction: tx };
  }
}
