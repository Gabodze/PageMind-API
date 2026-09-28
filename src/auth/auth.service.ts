// We handle authentication, including registration, login, token issuance, refresh, and logout.
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ENV } from '../config/env.constants';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// salt is for adding randomness to password hashes to enhance security
const SALT_ROUNDS = 12;

// AuthService handles user authentication, including registration, login, token issuance, refresh, and logout.
@Injectable()
export class AuthService {
  constructor(
    // Users service for managing user data
    private readonly usersService: UsersService,
    // Prisma service for database access
    private readonly prisma: PrismaService,
    // JWT service for issuing access and refresh tokens
    private readonly jwt: JwtService,
    // Config service for accessing environment variables
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(
      dto.email.toLowerCase(),
    );
    // Password hashing is for securely storing user passwords in the database.
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      password,
      name: dto.name,
    });

    return this.issueTokens(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    const invalid = new UnauthorizedException('Invalid credentials');

    if (!user) {
      throw invalid;
    }

    // we compare the provided password with the stored hash to verify credentials
    const matches = await bcrypt.compare(dto.password, user.password);
    if (!matches) {
      throw invalid;
    }

    return this.issueTokens(user.id, user.email, user.name);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.name,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash: this.hashToken(refreshToken) },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string | null,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow(ENV.JWT_ACCESS_SECRET),
        expiresIn: this.config.getOrThrow(ENV.JWT_ACCESS_EXPIRES_IN),
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const days = this.parseExpiryDays(
      this.config.getOrThrow(ENV.JWT_REFRESH_EXPIRES_IN),
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: { id: userId, email, name },
      accessToken,
      refreshToken,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryDays(value: string) {
    const match = /^(\d+)d$/.exec(value);
    return match ? Number(match[1]) : 7;
  }
}
