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
import { CurriculumService } from '../curriculum.service';
import {
  CurriculumOutlineDto,
  SafeLessonDto,
} from '../dto/curriculum-response.dto';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Curriculum & Learning Content')
@Controller()
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('courses/:courseId/curriculum')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get course curriculum outline (Public/Student)',
    description:
      'Returns curriculum outline with preview lessons. Full lesson content is unlocked for enrolled students with verified payment or course owners.',
  })
  @ApiResponse({
    status: 200,
    description: 'Curriculum outline',
    type: CurriculumOutlineDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found or not published' })
  async getCourseCurriculum(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user?: User,
  ): Promise<CurriculumOutlineDto> {
    return this.curriculumService.getCourseCurriculum(
      courseId,
      user ? { id: user.id, role: user.role } : undefined,
    );
  }

  @Get('lessons/:lessonId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lesson content by ID (Enrolled Student, Preview, or Course Owner)',
    description:
      'Returns full learning content (video, text, pdf) if the student is enrolled with verified payment, if the lesson is marked as preview, or if the user is the course instructor/admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Full lesson learning content',
    type: SafeLessonDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication required for protected lessons' })
  @ApiResponse({ status: 403, description: 'Access denied: Enrollment or payment required' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async getLessonById(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user?: User,
  ): Promise<SafeLessonDto> {
    return this.curriculumService.getLessonById(
      lessonId,
      user ? { id: user.id, role: user.role } : undefined,
    );
  }
}
