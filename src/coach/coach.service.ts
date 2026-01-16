import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class CoachService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { userId },
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    // Koçun öğrencilerini al
    const students = await this.prisma.studentProfile.findMany({
      where: { currentCoachId: coach.id },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    // Son ödevler (limit 5)
    const recentAssignments = await this.prisma.assignment.findMany({
      where: { coachId: coach.id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Bitişi yaklaşan ödevler (7 gün içinde)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingDeadlines = await this.prisma.assignment.findMany({
      where: {
        coachId: coach.id,
        endDate: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return {
      students,
      recentAssignments,
      upcomingDeadlines,
      stats: {
        totalStudents: students.length,
        totalAssignments: await this.prisma.assignment.count({
          where: { coachId: coach.id },
        }),
      },
    };
  }

  async getMyStudents(userId: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { userId },
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    return this.prisma.studentProfile.findMany({
      where: { currentCoachId: coach.id },
      include: {
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });
  }

  async searchStudents(query: string) {
    // Henüz koçu olmayan, onaylı öğrenciler
    return this.prisma.studentProfile.findMany({
      where: {
        currentCoachId: null,
        user: {
          status: 'APPROVED',
        },
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
      take: 20,
    });
  }

  async sendStudentRequest(userId: string, studentId: string, message?: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { userId },
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Zaten koçu var mı?
    if (student.currentCoachId) {
      throw new BadRequestException('Student already has a coach');
    }

    // Pending request var mı?
    const existingRequest = await this.prisma.coachStudentRequest.findFirst({
      where: {
        coachId: coach.id,
        studentId,
        status: RequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending request for this student');
    }

    const request = await this.prisma.coachStudentRequest.create({
      data: {
        coachId: coach.id,
        studentId,
        message,
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    return {
      message: 'Request sent successfully',
      request,
    };
  }

  async getMyRequests(userId: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { userId },
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    return this.prisma.coachStudentRequest.findMany({
      where: { coachId: coach.id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
