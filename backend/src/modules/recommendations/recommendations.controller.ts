import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get personalized course recommendations for authenticated student',
    description:
      'Generates deterministic, rule-based course recommendations using category learning history, completed prerequisites, difficulty progression, and quiz performance signals. Returns fallback recommendations for new students.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personalized course recommendations list',
    type: RecommendationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not possess STUDENT role',
  })
  async getMyRecommendations(
    @CurrentUser() user: User,
    @Query() query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationsService.getRecommendationsForStudent(user.id, query);
  }
}
