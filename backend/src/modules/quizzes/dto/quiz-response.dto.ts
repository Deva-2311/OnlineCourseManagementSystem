import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../enums/question-type.enum';
import { QuizAttemptStatus } from '../enums/quiz-attempt-status.enum';

export class SafeOptionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'd9b3a4e2-4567-4e89-b123-456789abcdef' })
  questionId: string;

  @ApiProperty({ example: 'Linearizability guarantees real-time ordering.' })
  optionText: string;

  @ApiProperty({ example: 0 })
  displayOrder: number;

  @ApiPropertyOptional({ example: true, description: 'Only included for instructors' })
  isCorrect?: boolean;
}

export class SafeQuestionDto {
  @ApiProperty({ example: 'd9b3a4e2-4567-4e89-b123-456789abcdef' })
  id: string;

  @ApiProperty({ example: 'c8a2b1f0-1234-5678-9abc-def012345678' })
  quizId: string;

  @ApiProperty({ example: 'Which consistency model requires immediate linearizability across all nodes?' })
  questionText: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  questionType: QuestionType;

  @ApiProperty({ example: 1 })
  points: number;

  @ApiProperty({ example: 0 })
  displayOrder: number;

  @ApiPropertyOptional({ example: 'Linearizability provides real-time strict consistency.', description: 'Only included for instructors' })
  explanation?: string | null;

  @ApiProperty({ type: [SafeOptionDto] })
  options: SafeOptionDto[];
}

export class SafeQuizDto {
  @ApiProperty({ example: 'c8a2b1f0-1234-5678-9abc-def012345678' })
  id: string;

  @ApiProperty({ example: 'f7e6d5c4-b3a2-1098-7654-3210fedcba98' })
  lessonId: string;

  @ApiProperty({ example: 'Quiz 1: Distributed Consensus' })
  title: string;

  @ApiPropertyOptional({ example: 'Answer all questions. Passing threshold is 70%.' })
  instructions?: string | null;

  @ApiPropertyOptional({ example: 15, nullable: true })
  timeLimitMinutes?: number | null;

  @ApiProperty({ example: 3 })
  maxAttempts: number;

  @ApiProperty({ example: 70.0 })
  passingScore: number;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: 10 })
  totalPoints: number;

  @ApiProperty({ example: 5 })
  questionsCount: number;

  @ApiProperty({ type: [SafeQuestionDto] })
  questions: SafeQuestionDto[];

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  updatedAt: Date;
}

export class SafeStudentAnswerDto {
  @ApiProperty({ example: '12345678-1234-1234-1234-123456789abc' })
  id: string;

  @ApiProperty({ example: '23456789-2345-2345-2345-23456789abcd' })
  attemptId: string;

  @ApiProperty({ example: 'd9b3a4e2-4567-4e89-b123-456789abcdef' })
  questionId: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nullable: true })
  selectedOptionId?: string | null;

  @ApiProperty({ example: 1.0 })
  awardedPoints: number;

  @ApiProperty({ example: true })
  isCorrect: boolean;
}

export class SafeQuizAttemptDto {
  @ApiProperty({ example: '23456789-2345-2345-2345-23456789abcd' })
  id: string;

  @ApiProperty({ example: 'c8a2b1f0-1234-5678-9abc-def012345678' })
  quizId: string;

  @ApiProperty({ example: '34567890-3456-3456-3456-3456789abcde' })
  studentId: string;

  @ApiProperty({ example: 1 })
  attemptNumber: number;

  @ApiProperty({ enum: QuizAttemptStatus, example: QuizAttemptStatus.SUBMITTED })
  status: QuizAttemptStatus;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  startedAt: Date;

  @ApiPropertyOptional({ example: '2026-10-11T12:08:30.000Z', nullable: true })
  submittedAt?: Date | null;

  @ApiProperty({ example: 8.0 })
  score: number;

  @ApiProperty({ example: 10.0 })
  maxScore: number;

  @ApiProperty({ example: 80.0 })
  percentage: number;

  @ApiProperty({ example: true })
  isPassed: boolean;

  @ApiProperty({ example: '2026-10-11T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T12:08:30.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [SafeStudentAnswerDto] })
  answers?: SafeStudentAnswerDto[];
}
