import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('El correo ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });
    const saved = await this.userRepo.save(user);

    // ClanCity: every N signups, randomly enable one user to create clans
    await this.maybEnableClanCreation();

    const token = this.generateToken(saved);
    return { token, user: this.sanitizeUser(saved) };
  }

  private async maybEnableClanCreation() {
    try {
      const totalUsers = await this.userRepo.count();
      // Read threshold from clan_creation_config table (default 100)
      const result = await this.userRepo.query(
        `SELECT value FROM clan_creation_config WHERE key = 'enableEveryNUsers' LIMIT 1`
      );
      const threshold = parseInt(result?.[0]?.value || '100', 10);
      if (totalUsers > 0 && totalUsers % threshold === 0) {
        await this.userRepo.query(`
          UPDATE users SET "canCreateClans" = true
          WHERE id = (
            SELECT id FROM users
            WHERE "canCreateClans" = false AND role = 'user' AND "isActive" = true
            ORDER BY RANDOM() LIMIT 1
          )
        `);
      }
    } catch (_) {
      // Config table may not exist yet — ignore silently
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return { token, refreshToken, user: this.sanitizeUser(user) };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);
    return this.sanitizeUser(updated);
  }

  private generateToken(user: User): string {
    const secret = this.config.get('JWT_SECRET', 'lagunapp-dev-secret');
    const expiresIn = this.config.get('JWT_EXPIRES_IN', '7d');
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn }
    );
  }

  private generateRefreshToken(user: User): string {
    const secret = this.config.get('JWT_SECRET', 'lagunapp-dev-secret');
    return jwt.sign({ sub: user.id, type: 'refresh' }, secret, {
      expiresIn: '30d',
    });
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}
