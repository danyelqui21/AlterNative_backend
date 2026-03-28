import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../../../../auth-service/src/app/entities/user.entity';
import { DeviceSession } from '../entities/device-session.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { EmailService } from './email.service';
import { IpGeolocationService } from './ip-geolocation.service';
import { StripeService } from './stripe.service';
import { StripeCustomer } from '../entities/stripe-customer.entity';

@Injectable()
export class AuthGatewayService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DeviceSession)
    private readonly sessionRepo: Repository<DeviceSession>,
    @InjectRepository(PasswordReset)
    private readonly resetRepo: Repository<PasswordReset>,
    @InjectRepository(StripeCustomer)
    private readonly stripeCustomerRepo: Repository<StripeCustomer>,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistService,
    private readonly emailService: EmailService,
    private readonly geolocation: IpGeolocationService,
    private readonly stripeService: StripeService,
  ) {}

  async register(dto: {
    name: string;
    lastName?: string;
    email: string;
    username?: string;
    password: string;
    confirmPassword: string;
    phoneCountryCode?: string;
    phone?: string;
    birthDate?: string;
    avatarUrl?: string;
    appName?: string;
  }, userAgent?: string, ip?: string, secChUa?: string) {
    // Validate password match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Las contrasenas no coinciden');
    }

    // Validate minimum age (18 years)
    if (dto.birthDate) {
      const birth = new Date(dto.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BadRequestException('Debes tener al menos 18 anos para registrarte');
      }
    }

    // Check email uniqueness
    const emailExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExists) {
      throw new ConflictException('El correo ya esta registrado');
    }

    // Check username uniqueness if provided
    if (dto.username) {
      const usernameExists = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (usernameExists) {
        throw new ConflictException('El nombre de usuario ya esta en uso');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      phoneCountryCode: dto.phoneCountryCode,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      avatarUrl: dto.avatarUrl,
    });
    const saved = await this.userRepo.save(user);

    const tokenId = uuidv4();
    const token = this.generateToken(saved, tokenId);
    const refreshToken = this.generateRefreshToken(saved, tokenId);

    // Create device session
    await this.createSession(saved.id, tokenId, userAgent, ip, dto.appName, secChUa);

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(saved.email, saved.name).catch(() => {});

    // Create Stripe customer (non-blocking — don't fail registration if Stripe is down)
    this.stripeService.createCustomer(saved.email, saved.name).then((customerId) => {
      if (customerId) {
        this.stripeCustomerRepo.save(
          this.stripeCustomerRepo.create({ userId: saved.id, stripeCustomerId: customerId }),
        );
      }
    }).catch(() => {});

    return { token, refreshToken, user: this.sanitizeUser(saved) };
  }

  async login(dto: { emailOrUsername: string; password: string; appName?: string }, userAgent?: string, ip?: string, secChUa?: string) {
    // Find by email or username
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.username = :identifier', {
        identifier: dto.emailOrUsername,
      })
      .getOne();

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta ha sido desactivada');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokenId = uuidv4();
    const token = this.generateToken(user, tokenId);
    const refreshToken = this.generateRefreshToken(user, tokenId);

    // Create device session
    await this.createSession(user.id, tokenId, userAgent, ip, dto.appName, secChUa);

    return { token, refreshToken, user: this.sanitizeUser(user) };
  }

  async forgotPassword(emailOrUsername: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.username = :identifier', {
        identifier: emailOrUsername,
      })
      .getOne();

    // Always return success to avoid revealing user existence
    if (user && user.isActive) {
      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const reset = this.resetRepo.create({
        userId: user.id,
        token: code,
        expiresAt,
      });
      await this.resetRepo.save(reset);

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(user.email, code, user.name);
    }

    return { message: 'Si el usuario existe, se envio un codigo de verificacion' };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.resetRepo.findOne({
      where: {
        token,
        used: false,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!reset) {
      throw new BadRequestException('Codigo invalido o expirado');
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(reset.userId, { password: hashedPassword });

    // Mark token as used
    reset.used = true;
    await this.resetRepo.save(reset);

    // Blacklist all active sessions for this user
    const sessions = await this.sessionRepo.find({
      where: { userId: reset.userId, isActive: true },
    });
    for (const session of sessions) {
      await this.blacklist.blacklist(session.tokenId);
      session.isActive = false;
    }
    if (sessions.length > 0) {
      await this.sessionRepo.save(sessions);
    }

    return { message: 'Contrasena actualizada' };
  }

  async verifyResetToken(token: string) {
    const reset = await this.resetRepo.findOne({
      where: {
        token,
        used: false,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    return { valid: !!reset };
  }

  async getDeviceSessions(userId: string) {
    return this.sessionRepo.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async closeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }

    session.isActive = false;
    await this.sessionRepo.save(session);
    await this.blacklist.blacklist(session.tokenId);

    return { message: 'Sesion cerrada' };
  }

  async closeAllSessionsByTokenId(userId: string, exceptTokenId?: string) {
    let exceptSessionId: string | undefined;
    if (exceptTokenId) {
      const currentSession = await this.sessionRepo.findOne({
        where: { userId, tokenId: exceptTokenId, isActive: true },
      });
      exceptSessionId = currentSession?.id;
    }
    return this.closeAllSessions(userId, exceptSessionId);
  }

  async closeAllSessions(userId: string, exceptSessionId?: string) {
    const where: any = { userId, isActive: true };
    if (exceptSessionId) {
      where.id = Not(exceptSessionId);
    }

    const sessions = await this.sessionRepo.find({ where });
    for (const session of sessions) {
      session.isActive = false;
      await this.blacklist.blacklist(session.tokenId);
    }
    if (sessions.length > 0) {
      await this.sessionRepo.save(sessions);
    }

    return { message: `${sessions.length} sesiones cerradas` };
  }

  async refreshToken(refreshTokenStr: string) {
    const secret = this.config.get('JWT_SECRET', 'lagunapp-dev-secret');

    let payload: any;
    try {
      payload = jwt.verify(refreshTokenStr, secret);
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token invalido');
    }

    // Check if tokenId is blacklisted
    if (payload.tid) {
      const isBlacklisted = await this.blacklist.isBlacklisted(payload.tid);
      if (isBlacklisted) {
        throw new UnauthorizedException('Sesion revocada');
      }
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o desactivado');
    }

    const newTokenId = uuidv4();
    const token = this.generateToken(user, newTokenId);
    const refreshToken = this.generateRefreshToken(user, newTokenId);

    // Update session lastUsedAt if old session exists
    if (payload.tid) {
      const session = await this.sessionRepo.findOne({
        where: { tokenId: payload.tid, isActive: true },
      });
      if (session) {
        session.tokenId = newTokenId;
        session.lastUsedAt = new Date();
        await this.sessionRepo.save(session);
      }
    }

    return { token, refreshToken };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: Record<string, unknown>) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Prevent updating sensitive fields directly
    delete dto.password;
    delete dto.role;
    delete dto.isActive;
    delete dto.isVerified;
    delete dto.canCreateClans;
    delete dto.provider;
    delete dto.providerId;
    delete dto.id;

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);
    return this.sanitizeUser(updated);
  }

  // --- Private helpers ---

  private generateToken(user: User, tokenId?: string): string {
    const secret = this.config.get('JWT_SECRET', 'lagunapp-dev-secret');
    const expiresIn = this.config.get('JWT_EXPIRATION', '7d');
    const tid = tokenId || uuidv4();
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role, tid },
      secret,
      { expiresIn }
    );
  }

  private generateRefreshToken(user: User, tokenId?: string): string {
    const secret = this.config.get('JWT_SECRET', 'lagunapp-dev-secret');
    const tid = tokenId || uuidv4();
    return jwt.sign({ sub: user.id, type: 'refresh', tid }, secret, {
      expiresIn: '30d',
    });
  }

  private async createSession(
    userId: string,
    tokenId: string,
    userAgent?: string,
    ip?: string,
    appName?: string,
    secChUa?: string,
  ): Promise<DeviceSession> {
    const deviceInfo = this.parseUserAgent(userAgent, secChUa);
    const session = this.sessionRepo.create({
      userId,
      tokenId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      ip: ip || null,
      appName: appName || null,
      lastUsedAt: new Date(),
    });
    const saved = await this.sessionRepo.save(session);

    // Non-blocking IP geolocation — update city/country in the background
    if (ip) {
      this.geolocation.lookup(ip).then((loc) => {
        if (loc.city || loc.country) {
          this.sessionRepo.update(saved.id, { city: loc.city, country: loc.country });
        }
      }).catch(() => {});
    }

    return saved;
  }

  private parseUserAgent(ua?: string, secChUa?: string) {
    if (!ua) return { deviceName: null, deviceType: null, os: null, browser: null };

    let os = 'Unknown';
    let browser = 'Unknown';
    let deviceType = 'web';
    let deviceName: string | null = null;

    // Detect OS
    if (ua.includes('Android')) { os = 'Android'; deviceType = 'mobile'; }
    else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = ua.includes('iPad') ? 'iPadOS' : 'iOS';
      deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
    }
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    // First try Sec-CH-UA header (accurate for Chromium-based browsers like Brave, Arc, Opera)
    if (secChUa) {
      if (secChUa.includes('Brave')) browser = 'Brave';
      else if (secChUa.includes('Opera')) browser = 'Opera';
      else if (secChUa.includes('Arc')) browser = 'Arc';
      else if (secChUa.includes('Vivaldi')) browser = 'Vivaldi';
      else if (secChUa.includes('Microsoft Edge')) browser = 'Edge';
      else if (secChUa.includes('Chromium')) browser = 'Chrome';
    }

    // Fallback to User-Agent if Sec-CH-UA didn't identify the browser
    if (browser === 'Unknown' && ua) {
    // Detect browser (order matters — check specific browsers before generic Chrome)
    if (ua.includes('Brave')) browser = 'Brave';
    else if (ua.includes('OPR' ) || ua.includes('Opera')) browser = 'Opera';
    else if (ua.includes('Arc')) browser = 'Arc';
    else if (ua.includes('Vivaldi')) browser = 'Vivaldi';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
    else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
    else if (ua.includes('Chromium')) browser = 'Chromium';
    else if (ua.includes('Safari')) browser = 'Safari';
    }

    // Build device name
    if (ua.includes('Dart') || ua.includes('Flutter')) {
      deviceType = 'mobile';
      browser = 'LagunApp';
    }

    deviceName = `${browser} en ${os}`;

    return { deviceName, deviceType, os, browser };
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}
