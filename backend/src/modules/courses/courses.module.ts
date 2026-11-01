import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { CoursesService } from './courses.service';
import { CoursesController } from './controllers/courses.controller';
import { InstructorCoursesController } from './controllers/instructor-courses.controller';
import { AdminCoursesController } from './controllers/admin-courses.controller';
import { CategoriesModule } from '../categories/categories.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Category, User]),
    CategoriesModule,
    AuthModule,
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [
    CoursesController,
    InstructorCoursesController,
    AdminCoursesController,
  ],
  providers: [CoursesService],
  exports: [CoursesService, TypeOrmModule],
})
export class CoursesModule {}
