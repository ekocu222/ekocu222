import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { 
  UpdateStudentProfileDto, 
  RespondToCoachRequestDto, 
  CreateCheckinDto,
  UpdateAssignmentProgressDto 
} from './dto/student.dto';

@ApiTags('Student')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my student profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.studentService.getProfile(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update my student profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentService.updateProfile(user.sub, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard' })
  async getDashboard(@CurrentUser() user: any) {
    return this.studentService.getDashboard(user.sub);
  }

  @Get('coach-requests')
  @ApiOperation({ summary: 'Get coach requests sent to me' })
  async getCoachRequests(@CurrentUser() user: any) {
    return this.studentService.getCoachRequests(user.sub);
  }

  @Post('coach-requests/:requestId/respond')
  @ApiOperation({ summary: 'Accept or reject a coach request' })
  async respondToRequest(
    @Param('requestId') requestId: string,
    @Body() dto: RespondToCoachRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.studentService.respondToCoachRequest(user.sub, requestId, dto.status);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get my assignments' })
  async getMyAssignments(@CurrentUser() user: any) {
    return this.studentService.getMyAssignments(user.sub);
  }

  @Post('assignments/progress')
  @ApiOperation({ summary: 'Update assignment progress' })
  async updateProgress(
    @CurrentUser() user: any,
    @Body() dto: UpdateAssignmentProgressDto,
  ) {
    return this.studentService.updateAssignmentProgress(user.sub, dto);
  }

  @Post('checkins')
  @ApiOperation({ summary: 'Create a check-in' })
  async createCheckin(
    @CurrentUser() user: any,
    @Body() dto: CreateCheckinDto,
  ) {
    return this.studentService.createCheckin(user.sub, dto);
  }

  @Get('checkins')
  @ApiOperation({ summary: 'Get my check-ins' })
  async getMyCheckins(@CurrentUser() user: any) {
    return this.studentService.getMyCheckins(user.sub);
  }
}
