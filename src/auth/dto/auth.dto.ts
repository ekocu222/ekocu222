import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterCoachDto {
  @ApiProperty({ example: 'coach@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ahmet' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Yılmaz' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '05551234567', required: false })
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  bio?: string;
}

export class RegisterStudentDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ayşe' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Demir' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '8. Sınıf' })
  @IsString()
  grade: string;

  @ApiProperty({ example: '05559876543', required: false })
  @IsString()
  phone?: string;

  @ApiProperty({ example: '05551112233', required: false })
  @IsString()
  parentPhone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    role: UserRole;
    status: string;
  };
}
