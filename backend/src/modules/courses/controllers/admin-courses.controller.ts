import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CoursesService } from '../courses.service';
import { RejectCourseDto } from '../dto/reject-course.dto';
import { CourseStatus } from '../enums/course-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { Course } from '../entities/course.entity';

@ApiTags('Admin Courses (Moderation)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all courses across all statuses (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: CourseStatus })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated courses list' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: CourseStatus,
  ) {
    return this.coursesService.findAllAdminCourses(page, limit, status);
  }

  @Get('pending')
  @ApiOperation({ summary: 'List all courses awaiting administrative review (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated pending review courses' })
  async findPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.coursesService.findPendingCourses(page, limit);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a pending course for public publication (Admin only)',
    description:
      'Transitions course from PENDING_REVIEW to PUBLISHED, sets publishedAt timestamp, and makes course visible in public catalogue.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Course })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Course is not pending review' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async approve(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.coursesService.approveCourse(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a pending course with feedback (Admin only)',
    description:
      'Transitions course from PENDING_REVIEW to REJECTED with mandatory feedback for the instructor.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Course })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Course is not pending review or missing feedback' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectCourseDto: RejectCourseDto,
  ): Promise<Course> {
    return this.coursesService.rejectCourse(id, rejectCourseDto.rejectionReason);
  }
}
