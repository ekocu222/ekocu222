import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPendingUsers(role?: UserRole) {
    const where: any = { status: UserStatus.PENDING };
    if (role) {
      where.role = role;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        coachProfile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            bio: true,
          },
        },
        studentProfile: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            phone: true,
            parentPhone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not pending approval');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    return { message: 'User approved successfully' };
  }

  async rejectUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not pending approval');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.REJECTED,
        approvedBy: adminId,
      },
    });

    return { message: 'User rejected successfully' };
  }

  async getAllUsers(role?: UserRole, status?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        coachProfile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        studentProfile: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            currentCoachId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [totalUsers, pendingUsers, coaches, students, assignments] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: UserStatus.PENDING } }),
        this.prisma.user.count({ where: { role: UserRole.COACH } }),
        this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
        this.prisma.assignment.count(),
      ]);

    return {
      totalUsers,
      pendingUsers,
      coaches,
      students,
      assignments,
    };
  }

  async changeStudentCoach(
    studentId: string,
    newCoachId: string,
    reason: string,
    adminId: string,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const newCoach = await this.prisma.coachProfile.findUnique({
      where: { id: newCoachId },
    });

    if (!newCoach) {
      throw new NotFoundException('Coach not found');
    }

    // Coach change log kaydet + öğrenciyi güncelle
    await this.prisma.$transaction([
      this.prisma.coachChangeLog.create({
        data: {
          studentId,
          oldCoachId: student.currentCoachId,
          newCoachId,
          changedBy: adminId,
          reason,
        },
      }),
      this.prisma.studentProfile.update({
        where: { id: studentId },
        data: { currentCoachId: newCoachId },
      }),
    ]);

    return { message: 'Coach changed successfully' };
  }
}
