import {
  Controller,
  Get,
  Post,
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
import { QuizzesService } from '../quizzes.service';
import { SafeQuizDto, SafeQuizAttemptDto } from '../dto/quiz-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get(':quizId')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get published quiz assessment for student without answer keys' })
  @ApiResponse({ status: 200, description: 'Student-safe quiz representation', type: SafeQuizDto })
  @ApiResponse({ status: 403, description: 'Active enrollment and payment required' })
  @ApiResponse({ status: 404, description: 'Quiz not found or not published' })
  async getQuiz(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<SafeQuizDto> {
    return this.quizzesService.getQuizForStudent(user.id, quizId);
  }

  @Post(':quizId/attempts')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start a new quiz attempt (Student)' })
  @ApiResponse({ status: 201, description: 'New quiz attempt initialized', type: SafeQuizAttemptDto })
  @ApiResponse({ status: 400, description: 'Maximum attempts exceeded or active attempt in progress' })
  @ApiResponse({ status: 403, description: 'Active enrollment and verified payment required' })
  @ApiResponse({ status: 404, description: 'Quiz not found or not published' })
  async startAttempt(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<SafeQuizAttemptDto> {
    return this.quizzesService.startAttempt(user.id, quizId);
  }
}
