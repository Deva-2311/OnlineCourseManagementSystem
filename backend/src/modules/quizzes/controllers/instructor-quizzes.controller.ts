import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
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
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { SafeQuizDto, SafeQuestionDto } from '../dto/quiz-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Instructor Quizzes')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiBearerAuth()
export class InstructorQuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // ==========================================
  // QUIZ CRUD ENDPOINTS
  // ==========================================

  @Post('lessons/:lessonId/quizzes')
  @ApiOperation({ summary: 'Create assessment quiz for lesson (Instructor)' })
  @ApiResponse({ status: 201, description: 'Quiz created', type: SafeQuizDto })
  @ApiResponse({ status: 400, description: 'Validation failed or attempted to publish empty quiz' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this course lesson' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async createQuiz(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateQuizDto,
  ): Promise<SafeQuizDto> {
    return this.quizzesService.createQuiz(user.id, lessonId, dto);
  }

  @Get('lessons/:lessonId/quizzes')
  @ApiOperation({ summary: 'List all quizzes for lesson (Instructor)' })
  @ApiResponse({ status: 200, description: 'List of quizzes with answer keys', type: [SafeQuizDto] })
  async findLessonQuizzes(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<SafeQuizDto[]> {
    return this.quizzesService.findLessonQuizzesForInstructor(user.id, lessonId);
  }

  @Get('quizzes/:quizId')
  @ApiOperation({ summary: 'Get quiz details including answer keys (Instructor)' })
  @ApiResponse({ status: 200, description: 'Quiz details with answer keys', type: SafeQuizDto })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findQuizById(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<SafeQuizDto> {
    return this.quizzesService.findQuizByIdForInstructor(user.id, quizId);
  }

  @Patch('quizzes/:quizId')
  @ApiOperation({ summary: 'Update quiz settings and publication state (Instructor)' })
  @ApiResponse({ status: 200, description: 'Quiz updated', type: SafeQuizDto })
  @ApiResponse({ status: 400, description: 'Validation failed or attempt restrictions violated' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async updateQuiz(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: UpdateQuizDto,
  ): Promise<SafeQuizDto> {
    return this.quizzesService.updateQuiz(user.id, quizId, dto);
  }

  @Delete('quizzes/:quizId')
  @ApiOperation({ summary: 'Delete quiz (Instructor)' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete quiz with existing student attempts' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async deleteQuiz(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<{ message: string }> {
    return this.quizzesService.deleteQuiz(user.id, quizId);
  }

  // ==========================================
  // QUESTION CRUD ENDPOINTS
  // ==========================================

  @Post('quizzes/:quizId/questions')
  @ApiOperation({ summary: 'Add question with answer options to quiz (Instructor)' })
  @ApiResponse({ status: 201, description: 'Question created', type: SafeQuestionDto })
  @ApiResponse({ status: 400, description: 'Validation failed or student attempts exist' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async createQuestion(
    @CurrentUser() user: User,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<SafeQuestionDto> {
    return this.quizzesService.createQuestion(user.id, quizId, dto);
  }

  @Patch('questions/:questionId')
  @ApiOperation({ summary: 'Update question prompt, options, or points (Instructor)' })
  @ApiResponse({ status: 200, description: 'Question updated', type: SafeQuestionDto })
  @ApiResponse({ status: 400, description: 'Validation failed or student attempts exist' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this question' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestion(
    @CurrentUser() user: User,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<SafeQuestionDto> {
    return this.quizzesService.updateQuestion(user.id, questionId, dto);
  }

  @Delete('questions/:questionId')
  @ApiOperation({ summary: 'Delete question from quiz (Instructor)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete question when student attempts exist' })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this question' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async deleteQuestion(
    @CurrentUser() user: User,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<{ message: string }> {
    return this.quizzesService.deleteQuestion(user.id, questionId);
  }
}
