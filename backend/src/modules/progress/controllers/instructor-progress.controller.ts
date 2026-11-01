import {
  Controller,
  Get,
  Param,
  Query,
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
import {
  InstructorCourseProgressQueryDto,
  InstructorCourseProgressResponseDto,
} from '../dto/instructor-course-progress-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Instructor Progress')
@Controller('instructor/courses/:courseId/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstructorProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'View student learning progress for an owned course (Instructor)',
    description:
      'Returns paginated student progress metrics for students enrolled in the instructor’s course.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated student progress list',
    type: InstructorCourseProgressResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseProgress(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: InstructorCourseProgressQueryDto,
  ): Promise<InstructorCourseProgressResponseDto> {
    return this.progressService.getCourseProgressForInstructor(
      user.id,
      courseId,
      query,
    );
  }
}
