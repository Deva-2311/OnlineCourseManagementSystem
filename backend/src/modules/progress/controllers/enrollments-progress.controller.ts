import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProgressService } from '../progress.service';
import { CourseProgressSummaryDto } from '../dto/course-progress-summary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Learning Progress')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentsProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('enrollments/:enrollmentId/progress')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get course learning progress summary by enrollment ID (Student)' })
  @ApiResponse({
    status: 200,
    description: 'Calculated course progress summary',
    type: CourseProgressSummaryDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied: Cannot view another student’s progress' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async getEnrollmentProgress(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<CourseProgressSummaryDto> {
    return this.progressService.getCourseProgressByEnrollment(user.id, enrollmentId);
  }

  @Get('courses/:courseId/progress')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get course learning progress summary by course ID (Student)' })
  @ApiResponse({
    status: 200,
    description: 'Calculated course progress summary',
    type: CourseProgressSummaryDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied: Active enrollment required' })
  @ApiResponse({ status: 404, description: 'Enrollment not found for course' })
  async getCourseProgress(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseProgressSummaryDto> {
    return this.progressService.getCourseProgressByCourseId(user.id, courseId);
  }
}
