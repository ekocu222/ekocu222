import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  grade?: string;
}

export class RespondToCoachRequestDto {
  @ApiProperty({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  status: RequestStatus.ACCEPTED | RequestStatus.REJECTED;
}

export class CreateCheckinDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateAssignmentProgressDto {
  @ApiProperty()
  @IsString()
  assignmentItemId: string;

  @ApiProperty()
  @IsString()
  completedCount: number;
}
