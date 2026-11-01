import { Controller, Get, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { LearningInsightsService } from '../learning-insights.service';
import { LearningInsightsResponseDto } from '../dto/learning-insights-response.dto';

@ApiTags('Learning Insights & Skill Gap Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('learning-insights')
export class LearningInsightsController {
  constructor(private readonly learningInsightsService: LearningInsightsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get skill-gap analysis and proficiency breakdown for authenticated student',
    description:
      'Evaluates empirical quiz attempt data, mapping question outcomes to skills and classifying proficiency as STRONG, DEVELOPING, NEEDS_IMPROVEMENT, or INSUFFICIENT_DATA.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student learning insights and skill proficiency breakdown',
    type: LearningInsightsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Requires STUDENT role' })
  async getMyInsights(@CurrentUser() user: User): Promise<LearningInsightsResponseDto> {
    return this.learningInsightsService.getLearningInsightsForStudent(user.id);
  }
}
