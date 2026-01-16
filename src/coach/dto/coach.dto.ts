import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SendStudentRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
