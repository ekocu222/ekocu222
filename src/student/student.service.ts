import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus, UserRole } from '@prisma/client';
import { UpdateStudentProfileDto, CreateCheckinDto, UpdateAssignmentProgressDto } from './dto/student.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
      },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    return {
      email: user.email,
      status: user.status,
      profile: user.studentProfile,
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const updated = await this.prisma.studentProfile.update({
      where: { userId },
      data: dto,
    });

    return { message: 'Profile updated successfully', profile: updated };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            currentCoach: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            receivedRequests: {
              where: { status: RequestStatus.PENDING },
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
              },
            },
            assignments: {
              where: {
                endDate: {
                  gte: new Date(),
                },
              },
              include: {
                coach: true,
                items: {
                  include: {
                    progress: true,
                  },
                },
              },
              orderBy: {
                endDate: 'asc',
              },
              take: 5,
            },
          },
        },
      },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    return {
      profile: user.studentProfile,
      currentCoach: user.studentProfile.currentCoach,
      pendingRequests: user.studentProfile.receivedRequests,
      upcomingAssignments: user.studentProfile.assignments,
    };
  }

  async getCoachRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const requests = await this.prisma.coachStudentRequest.findMany({
      where: { studentId: user.studentProfile.id },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async respondToCoachRequest(userId: string, requestId: string, status: RequestStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const request = await this.prisma.coachStudentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.studentId !== user.studentProfile.id) {
      throw new ForbiddenException('This request does not belong to you');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request already responded');
    }

    // Eğer kabul edildiyse, öğrenciye koç ata
    if (status === RequestStatus.ACCEPTED) {
      // Eğer öğrencinin zaten bir koçu varsa, kabul edilemez
      if (user.studentProfile.currentCoachId) {
        throw new BadRequestException('You already have a coach');
      }

      // Transaction: request güncelle + öğrenciye koç ata
      await this.prisma.$transaction([
        this.prisma.coachStudentRequest.update({
          where: { id: requestId },
          data: {
            status,
            respondedAt: new Date(),
          },
        }),
        this.prisma.studentProfile.update({
          where: { id: user.studentProfile.id },
          data: {
            currentCoachId: request.coachId,
          },
        }),
      ]);

      return { message: 'Request accepted. Coach assigned successfully.' };
    } else if (status === RequestStatus.REJECTED) {
      await this.prisma.coachStudentRequest.update({
        where: { id: requestId },
        data: {
          status,
          respondedAt: new Date(),
        },
      });

      return { message: 'Request rejected.' };
    } else {
      throw new BadRequestException('Invalid status');
    }
  }

  async getMyAssignments(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { studentId: user.studentProfile.id },
      include: {
        coach: true,
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

  async updateAssignmentProgress(userId: string, dto: UpdateAssignmentProgressDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const assignmentItem = await this.prisma.assignmentItem.findUnique({
      where: { id: dto.assignmentItemId },
      include: {
        assignment: true,
      },
    });

    if (!assignmentItem) {
      throw new NotFoundException('Assignment item not found');
    }

    if (assignmentItem.assignment.studentId !== user.studentProfile.id) {
      throw new ForbiddenException('This assignment does not belong to you');
    }

    // Upsert: varsa güncelle, yoksa oluştur
    const progress = await this.prisma.assignmentItemProgress.upsert({
      where: { assignmentItemId: dto.assignmentItemId },
      update: { completedCount: dto.completedCount },
      create: {
        assignmentItemId: dto.assignmentItemId,
        completedCount: dto.completedCount,
      },
    });

    return { message: 'Progress updated', progress };
  }

  async createCheckin(userId: string, dto: CreateCheckinDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const checkin = await this.prisma.studentCheckin.create({
      data: {
        studentId: user.studentProfile.id,
        assignmentId: dto.assignmentId,
        note: dto.note,
      },
    });

    return { message: 'Check-in created', checkin };
  }

  async getMyCheckins(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const checkins = await this.prisma.studentCheckin.findMany({
      where: { studentId: user.studentProfile.id },
      include: {
        assignment: {
          include: {
            coach: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return checkins;
  }
}
