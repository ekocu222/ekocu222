import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoachService } from './coach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SendStudentRequestDto } from './dto/coach.dto';

@ApiTags('Coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COACH)
@Controller('coach')
export class CoachController {
  constructor(private coachService: CoachService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get coach dashboard data' })
  async getDashboard(@CurrentUser() user: any) {
    return this.coachService.getDashboard(user.sub);
  }

  @Get('students')
  @ApiOperation({ summary: 'Get my students' })
  async getMyStudents(@CurrentUser() user: any) {
    return this.coachService.getMyStudents(user.sub);
  }

  @Get('students/search')
  @ApiOperation({ summary: 'Search available students' })
  async searchStudents(@Query('query') query: string) {
    return this.coachService.searchStudents(query);
  }

  @Post('students/:studentId/request')
  @ApiOperation({ summary: 'Send request to add a student' })
  async sendStudentRequest(
    @Param('studentId') studentId: string,
    @Body() dto: SendStudentRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.coachService.sendStudentRequest(user.sub, studentId, dto.message);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get my student requests' })
  async getMyRequests(@CurrentUser() user: any) {
    return this.coachService.getMyRequests(user.sub);
  }
}
