import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { CoachModule } from './coach/coach.module';
import { StudentModule } from './student/student.module';
import { AssignmentModule } from './assignment/assignment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    CoachModule,
    StudentModule,
    AssignmentModule,
  ],
})
export class AppModule {}
