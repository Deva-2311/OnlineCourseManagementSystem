import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EnrollmentsService } from '../enrollments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

@ApiTags('Instructor Course Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@Controller('instructor/courses')
export class InstructorEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':courseId/enrollments')
  @ApiOperation({
    summary: 'View enrolled students for an authored course (Instructor only)',
    description: 'Enforces instructor course ownership verification.',
  })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of students enrolled in this course',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Course owned by another instructor' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async findCourseEnrollments(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollmentsService.findCourseEnrollmentsForInstructor(
      user.id,
      courseId,
    );
  }
}
