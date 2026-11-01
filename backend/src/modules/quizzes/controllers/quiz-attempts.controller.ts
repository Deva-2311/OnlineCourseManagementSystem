import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { QuizzesService } from '../quizzes.service';
import { SubmitQuizAttemptDto } from '../dto/submit-attempt.dto';
import { SafeQuizAttemptDto } from '../dto/quiz-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Quiz Attempts')
@Controller('quiz-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuizAttemptsController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get(':attemptId')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get details and status of a quiz attempt' })
  @ApiResponse({ status: 200, description: 'Quiz attempt details', type: SafeQuizAttemptDto })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this attempt' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async getAttempt(
    @CurrentUser() user: User,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<SafeQuizAttemptDto> {
    return this.quizzesService.getAttempt(user.id, attemptId);
  }

  @Post(':attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit quiz attempt for server-side auto-grading' })
  @ApiResponse({ status: 200, description: 'Graded quiz attempt result', type: SafeQuizAttemptDto })
  @ApiResponse({ status: 400, description: 'Expired attempt, duplicate submission, or invalid question/option IDs' })
  @ApiResponse({ status: 403, description: 'Access denied: You cannot submit another student’s attempt' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async submitAttempt(
    @CurrentUser() user: User,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitQuizAttemptDto,
  ): Promise<SafeQuizAttemptDto> {
    return this.quizzesService.submitAttempt(user.id, attemptId, dto);
  }
}
