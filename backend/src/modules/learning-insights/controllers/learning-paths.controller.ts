import { Controller, Get, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { LearningInsightsService } from '../learning-insights.service';
import { LearningPathResponseDto } from '../dto/learning-path-response.dto';

@ApiTags('Adaptive Learning Paths')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('learning-paths')
export class LearningPathsController {
  constructor(private readonly learningInsightsService: LearningInsightsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get ordered adaptive learning roadmap for authenticated student',
    description:
      'Generates personalized sequence of remedial lessons, targeted practice quizzes, and curriculum progression milestones.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ordered adaptive learning path',
    type: LearningPathResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Requires STUDENT role' })
  async getMyLearningPath(@CurrentUser() user: User): Promise<LearningPathResponseDto> {
    return this.learningInsightsService.getAdaptiveLearningPathForStudent(user.id);
  }
}
