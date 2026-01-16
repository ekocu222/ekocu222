import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('pending-users')
  @ApiOperation({ summary: 'Get pending user registrations' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  async getPendingUsers(@Query('role') role?: UserRole) {
    return this.adminService.getPendingUsers(role);
  }

  @Post('users/:userId/approve')
  @ApiOperation({ summary: 'Approve a user registration' })
  async approveUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.approveUser(userId, admin.sub);
  }

  @Post('users/:userId/reject')
  @ApiOperation({ summary: 'Reject a user registration' })
  async rejectUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.rejectUser(userId, admin.sub);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAllUsers(
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllUsers(role, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Post('students/:studentId/change-coach')
  @ApiOperation({ summary: 'Change student coach (admin only)' })
  async changeStudentCoach(
    @Param('studentId') studentId: string,
    @Query('newCoachId') newCoachId: string,
    @Query('reason') reason: string,
    @CurrentUser() admin: any,
  ) {
    return this.adminService.changeStudentCoach(studentId, newCoachId, reason, admin.sub);
  }
}
