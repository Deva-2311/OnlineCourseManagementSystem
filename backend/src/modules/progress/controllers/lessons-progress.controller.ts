import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProgressService } from '../progress.service';
import {
  SafeLessonProgressDto,
  LessonProgressActionResponseDto,
} from '../dto/lesson-progress-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Learning Progress')
@Controller('lessons/:lessonId/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LessonsProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('start')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start lesson progress (Student)' })
  @ApiResponse({
    status: 200,
    description: 'Lesson progress started or resumed',
    type: LessonProgressActionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Active enrollment with verified payment required' })
  @ApiResponse({ status: 404, description: 'Lesson or enrollment not found' })
  async startProgress(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonProgressActionResponseDto> {
    return this.progressService.startLessonProgress(user.id, lessonId);
  }

  @Post('complete')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lesson as complete (Student)' })
  @ApiResponse({
    status: 200,
    description: 'Lesson marked as complete; returns updated course progress',
    type: LessonProgressActionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Active enrollment with verified payment required' })
  @ApiResponse({ status: 404, description: 'Lesson or enrollment not found' })
  async completeProgress(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonProgressActionResponseDto> {
    return this.progressService.completeLessonProgress(user.id, lessonId);
  }

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get current student progress for a specific lesson' })
  @ApiResponse({
    status: 200,
    description: 'Current lesson progress record',
    type: SafeLessonProgressDto,
  })
  @ApiResponse({ status: 403, description: 'Active enrollment required' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async getLessonProgress(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<SafeLessonProgressDto> {
    return this.progressService.getLessonProgress(user.id, lessonId);
  }
}
