import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { RegisterCoachDto, RegisterStudentDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async registerCoach(dto: RegisterCoachDto): Promise<{ message: string }> {
    // Email kontrolü
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already exists');
    }

    // Şifre hash
    const passwordHash = await argon2.hash(dto.password);

    // User + CoachProfile oluştur
    await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.COACH,
        status: UserStatus.PENDING,
        coachProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            bio: dto.bio,
          },
        },
      },
    });

    return { message: 'Registration successful. Waiting for admin approval.' };
  }

  async registerStudent(dto: RegisterStudentDto): Promise<{ message: string }> {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.PENDING,
        studentProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            grade: dto.grade,
            phone: dto.phone,
            parentPhone: dto.parentPhone,
          },
        },
      },
    });

    return { message: 'Registration successful. Waiting for admin approval.' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Kullanıcıyı bul
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        coachProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Şifre kontrolü
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Status kontrolü (kritik: onaysız giriş yapamaz)
    if (user.status !== UserStatus.APPROVED) {
      throw new UnauthorizedException('Your account is pending approval or has been rejected');
    }

    // Token üret
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Refresh token'ı DB'ye kaydet
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Token DB'de var mı ve geçerli mi?
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Yeni access token üret
    const accessToken = this.jwtService.sign(
      {
        sub: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
      },
    );

    return { accessToken };
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Kullanıcının tüm refresh token'larını sil
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out successfully' };
  }

  // Helper methods
  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 gün

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
