import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto';

@ApiTags('Assignment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private assignmentService: AssignmentService) {}

  @Post()
  @Roles(UserRole.COACH)
  @ApiOperation({ summary: 'Create a new assignment (Coach only)' })
  async createAssignment(
    @CurrentUser() user: any,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentService.createAssignment(user.sub, dto);
  }

  @Get('coach/my-assignments')
  @Roles(UserRole.COACH)
  @ApiOperation({ summary: 'Get my assignments as coach' })
  @ApiQuery({ name: 'studentId', required: false })
  async getCoachAssignments(
    @CurrentUser() user: any,
    @Query('studentId') studentId?: string,
  ) {
    return this.assignmentService.getCoachAssignments(user.sub, studentId);
  }

  @Get(':id')
  @Roles(UserRole.COACH, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get assignment by ID' })
  async getAssignment(
    @CurrentUser() user: any,
    @Param('id') assignmentId: string,
  ) {
    return this.assignmentService.getAssignment(user.sub, assignmentId, user.role);
  }

  @Put(':id')
  @Roles(UserRole.COACH)
  @ApiOperation({ summary: 'Update assignment (Coach only)' })
  async updateAssignment(
    @CurrentUser() user: any,
    @Param('id') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentService.updateAssignment(user.sub, assignmentId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COACH)
  @ApiOperation({ summary: 'Delete assignment (Coach only)' })
  async deleteAssignment(
    @CurrentUser() user: any,
    @Param('id') assignmentId: string,
  ) {
    return this.assignmentService.deleteAssignment(user.sub, assignmentId);
  }

  @Get(':id/progress')
  @Roles(UserRole.COACH, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get assignment progress' })
  async getAssignmentProgress(
    @CurrentUser() user: any,
    @Param('id') assignmentId: string,
  ) {
    return this.assignmentService.getAssignmentProgress(user.sub, assignmentId, user.role);
  }
}
