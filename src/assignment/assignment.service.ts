import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto';

@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(coachUserId: string, dto: CreateAssignmentDto) {
    // Koçun profil ID'sini bul
    const coach = await this.prisma.user.findUnique({
      where: { id: coachUserId },
      include: { coachProfile: true },
    });

    if (!coach || !coach.coachProfile) {
      throw new NotFoundException('Coach profile not found');
    }

    // Öğrenci kontrolü
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Bu koçun öğrencisi olup olmadığını kontrol et
    if (student.currentCoachId !== coach.coachProfile.id) {
      throw new ForbiddenException('This student is not assigned to you');
    }

    // Tarih kontrolü
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Assignment oluştur
    const assignment = await this.prisma.assignment.create({
      data: {
        coachId: coach.coachProfile.id,
        studentId: dto.studentId,
        startDate,
        endDate,
        items: {
          create: dto.items,
        },
      },
      include: {
        items: true,
        student: true,
      },
    });

    return { message: 'Assignment created successfully', assignment };
  }

  async getAssignment(userId: string, assignmentId: string, userRole: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        coach: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        items: {
          include: {
            progress: true,
          },
        },
        checkins: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Yetki kontrolü: sadece ilgili koç veya öğrenci görebilir
    if (userRole === 'COACH') {
      const coach = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { coachProfile: true },
      });
      if (!coach?.coachProfile || assignment.coachId !== coach.coachProfile.id) {
        throw new ForbiddenException('You do not have access to this assignment');
      }
    } else if (userRole === 'STUDENT') {
      const student = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true },
      });
      if (!student?.studentProfile || assignment.studentId !== student.studentProfile.id) {
        throw new ForbiddenException('You do not have access to this assignment');
      }
    }

    return assignment;
  }

  async updateAssignment(coachUserId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const coach = await this.prisma.user.findUnique({
      where: { id: coachUserId },
      include: { coachProfile: true },
    });

    if (!coach || !coach.coachProfile) {
      throw new NotFoundException('Coach profile not found');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.coachId !== coach.coachProfile.id) {
      throw new ForbiddenException('You do not have access to this assignment');
    }

    // Tarih kontrolü
    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        items: {
          include: {
            progress: true,
          },
        },
      },
    });

    return { message: 'Assignment updated successfully', assignment: updated };
  }

  async deleteAssignment(coachUserId: string, assignmentId: string) {
    const coach = await this.prisma.user.findUnique({
      where: { id: coachUserId },
      include: { coachProfile: true },
    });

    if (!coach || !coach.coachProfile) {
      throw new NotFoundException('Coach profile not found');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.coachId !== coach.coachProfile.id) {
      throw new ForbiddenException('You do not have access to this assignment');
    }

    await this.prisma.assignment.delete({
      where: { id: assignmentId },
    });

    return { message: 'Assignment deleted successfully' };
  }

  async getCoachAssignments(coachUserId: string, studentId?: string) {
    const coach = await this.prisma.user.findUnique({
      where: { id: coachUserId },
      include: { coachProfile: true },
    });

    if (!coach || !coach.coachProfile) {
      throw new NotFoundException('Coach profile not found');
    }

    const where: any = {
      coachId: coach.coachProfile.id,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    const assignments = await this.prisma.assignment.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        items: {
          include: {
            progress: true,
          },
        },
      },
      orderBy: { endDate: 'desc' },
    });

    return assignments;
  }

  async getAssignmentProgress(userId: string, assignmentId: string, userRole: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        items: {
          include: {
            progress: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Yetki kontrolü
    if (userRole === 'COACH') {
      const coach = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { coachProfile: true },
      });
      if (!coach?.coachProfile || assignment.coachId !== coach.coachProfile.id) {
        throw new ForbiddenException('You do not have access to this assignment');
      }
    } else if (userRole === 'STUDENT') {
      const student = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true },
      });
      if (!student?.studentProfile || assignment.studentId !== student.studentProfile.id) {
        throw new ForbiddenException('You do not have access to this assignment');
      }
    }

    // İlerleme hesaplama
    const totalQuestions = assignment.items.reduce((sum, item) => sum + item.questionCount, 0);
    const completedQuestions = assignment.items.reduce(
      (sum, item) => sum + (item.progress?.completedCount || 0),
      0,
    );
    const progressPercentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

    return {
      assignmentId: assignment.id,
      totalQuestions,
      completedQuestions,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      items: assignment.items.map((item) => ({
        id: item.id,
        subject: item.subject,
        topic: item.topic,
        questionCount: item.questionCount,
        completedCount: item.progress?.completedCount || 0,
        progressPercentage:
          Math.round(((item.progress?.completedCount || 0) / item.questionCount) * 10000) / 100,
      })),
    };
  }
}
