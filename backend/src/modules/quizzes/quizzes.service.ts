import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { StudentAnswer } from './entities/student-answer.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { QuestionType } from './enums/question-type.enum';
import { QuizAttemptStatus } from './enums/quiz-attempt-status.enum';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizAttemptDto } from './dto/submit-attempt.dto';
import {
  SafeQuizDto,
  SafeQuestionDto,
  SafeQuizAttemptDto,
} from './dto/quiz-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { quizResultTemplate } from '../notifications/email/email.templates';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepository: Repository<StudentAnswer>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ==========================================
  // INSTRUCTOR AUTHORIZATION HELPERS
  // ==========================================

  private async validateInstructorLessonOwnership(
    instructorId: string,
    lessonId: string,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    const course = lesson.section?.course;
    if (!course || course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Access denied: You do not own the course containing this lesson',
      );
    }

    return lesson;
  }

  private async validateInstructorQuizOwnership(
    instructorId: string,
    quizId: string,
  ): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: {
        lesson: { section: { course: true } },
        questions: { options: true },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID "${quizId}" not found`);
    }

    const course = quiz.lesson?.section?.course;
    if (!course || course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Access denied: You do not own the course containing this quiz',
      );
    }

    return quiz;
  }

  private async validateInstructorQuestionOwnership(
    instructorId: string,
    questionId: string,
  ): Promise<QuizQuestion> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: {
        quiz: { lesson: { section: { course: true } } },
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    const course = question.quiz?.lesson?.section?.course;
    if (!course || course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Access denied: You do not own the course containing this question',
      );
    }

    return question;
  }

  // ==========================================
  // INSTRUCTOR QUIZ MANAGEMENT
  // ==========================================

  async createQuiz(
    instructorId: string,
    lessonId: string,
    dto: CreateQuizDto,
  ): Promise<SafeQuizDto> {
    await this.validateInstructorLessonOwnership(instructorId, lessonId);

    if (dto.isPublished === true) {
      throw new BadRequestException('Cannot publish a new quiz without any questions');
    }

    const quiz = this.quizRepository.create({
      lessonId,
      title: dto.title.trim(),
      instructions: dto.instructions ? dto.instructions.trim() : null,
      timeLimitMinutes: dto.timeLimitMinutes ?? null,
      maxAttempts: dto.maxAttempts ?? 1,
      passingScore: dto.passingScore ?? 70.0,
      isPublished: dto.isPublished ?? false,
    });

    const saved = await this.quizRepository.save(quiz);
    this.logger.log(`Created Quiz [${saved.id}] for Lesson [${lessonId}]`);

    return saved.toSafeQuiz(true);
  }

  async findLessonQuizzesForInstructor(
    instructorId: string,
    lessonId: string,
  ): Promise<SafeQuizDto[]> {
    await this.validateInstructorLessonOwnership(instructorId, lessonId);

    const quizzes = await this.quizRepository.find({
      where: { lessonId },
      relations: { questions: { options: true } },
      order: { createdAt: 'ASC' },
    });

    return quizzes.map((q) => q.toSafeQuiz(true));
  }

  async findQuizByIdForInstructor(
    instructorId: string,
    quizId: string,
  ): Promise<SafeQuizDto> {
    const quiz = await this.validateInstructorQuizOwnership(instructorId, quizId);
    return quiz.toSafeQuiz(true);
  }

  async updateQuiz(
    instructorId: string,
    quizId: string,
    dto: UpdateQuizDto,
  ): Promise<SafeQuizDto> {
    const quiz = await this.validateInstructorQuizOwnership(instructorId, quizId);

    const attemptsCount = await this.attemptRepository.count({
      where: { quizId },
    });

    if (attemptsCount > 0) {
      if (
        dto.passingScore !== undefined ||
        dto.timeLimitMinutes !== undefined ||
        dto.maxAttempts !== undefined
      ) {
        throw new BadRequestException(
          'Cannot modify passing score, time limit, or maximum attempts because student attempts already exist for this quiz',
        );
      }
    }

    if (dto.isPublished === true) {
      if (!quiz.questions || quiz.questions.length === 0) {
        throw new BadRequestException('Cannot publish a quiz with no questions');
      }

      for (const question of quiz.questions) {
        if (!question.options || question.options.length < 2) {
          throw new BadRequestException(
            `Question "${question.questionText}" must have at least 2 options before publishing`,
          );
        }
        const correctCount = question.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          throw new BadRequestException(
            `Question "${question.questionText}" must have exactly one correct answer before publishing`,
          );
        }
      }
    }

    if (dto.title !== undefined) {
      quiz.title = dto.title.trim();
    }
    if (dto.instructions !== undefined) {
      quiz.instructions = dto.instructions ? dto.instructions.trim() : null;
    }
    if (dto.timeLimitMinutes !== undefined) {
      quiz.timeLimitMinutes = dto.timeLimitMinutes;
    }
    if (dto.maxAttempts !== undefined) {
      quiz.maxAttempts = dto.maxAttempts;
    }
    if (dto.passingScore !== undefined) {
      quiz.passingScore = dto.passingScore;
    }
    if (dto.isPublished !== undefined) {
      quiz.isPublished = dto.isPublished;
    }

    const saved = await this.quizRepository.save(quiz);
    this.logger.log(`Updated Quiz [${saved.id}] by Instructor [${instructorId}]`);

    return saved.toSafeQuiz(true);
  }

  async deleteQuiz(
    instructorId: string,
    quizId: string,
  ): Promise<{ message: string }> {
    const quiz = await this.validateInstructorQuizOwnership(instructorId, quizId);

    const attemptsCount = await this.attemptRepository.count({
      where: { quizId },
    });

    if (attemptsCount > 0) {
      throw new BadRequestException(
        'Cannot delete quiz because student attempts already exist',
      );
    }

    await this.quizRepository.remove(quiz);
    this.logger.log(`Deleted Quiz [${quizId}] by Instructor [${instructorId}]`);

    return { message: 'Quiz successfully deleted' };
  }

  // ==========================================
  // INSTRUCTOR QUESTION MANAGEMENT
  // ==========================================

  async createQuestion(
    instructorId: string,
    quizId: string,
    dto: CreateQuestionDto,
  ): Promise<SafeQuestionDto> {
    await this.validateInstructorQuizOwnership(instructorId, quizId);

    const attemptsCount = await this.attemptRepository.count({
      where: { quizId },
    });

    if (attemptsCount > 0) {
      throw new BadRequestException(
        'Cannot add questions because student attempts already exist for this quiz',
      );
    }

    if (dto.questionType === QuestionType.TRUE_FALSE && dto.options.length !== 2) {
      throw new BadRequestException(
        'True/False questions must contain exactly 2 answer choices',
      );
    }

    if (dto.options.length < 2) {
      throw new BadRequestException(
        'Objective questions must contain at least 2 answer choices',
      );
    }

    const correctCount = dto.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        'Objective questions must have exactly one correct answer option marked',
      );
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const highestQuestion = await this.questionRepository.findOne({
        where: { quizId },
        order: { displayOrder: 'DESC' },
      });
      displayOrder = highestQuestion ? highestQuestion.displayOrder + 1 : 0;
    }

    const question = this.questionRepository.create({
      quizId,
      questionText: dto.questionText.trim(),
      questionType: dto.questionType,
      points: dto.points ?? 1,
      displayOrder,
      explanation: dto.explanation ? dto.explanation.trim() : null,
    });

    const savedQuestion = await this.questionRepository.save(question);

    const options = dto.options.map((opt, idx) =>
      this.optionRepository.create({
        questionId: savedQuestion.id,
        optionText: opt.optionText.trim(),
        isCorrect: opt.isCorrect,
        displayOrder: opt.displayOrder ?? idx,
      }),
    );

    savedQuestion.options = await this.optionRepository.save(options);
    this.logger.log(
      `Created Question [${savedQuestion.id}] in Quiz [${quizId}] by Instructor [${instructorId}]`,
    );

    return savedQuestion.toSafeQuestion(true);
  }

  async updateQuestion(
    instructorId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ): Promise<SafeQuestionDto> {
    const question = await this.validateInstructorQuestionOwnership(
      instructorId,
      questionId,
    );

    const attemptsCount = await this.attemptRepository.count({
      where: { quizId: question.quizId },
    });

    if (attemptsCount > 0) {
      throw new BadRequestException(
        'Cannot modify question structure because student attempts already exist for this quiz',
      );
    }

    const targetType = dto.questionType ?? question.questionType;

    if (dto.options) {
      if (targetType === QuestionType.TRUE_FALSE && dto.options.length !== 2) {
        throw new BadRequestException(
          'True/False questions must contain exactly 2 answer choices',
        );
      }

      if (dto.options.length < 2) {
        throw new BadRequestException(
          'Objective questions must contain at least 2 answer choices',
        );
      }

      const correctCount = dto.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          'Objective questions must have exactly one correct answer option marked',
        );
      }

      await this.optionRepository.delete({ questionId });

      const newOptions = dto.options.map((opt, idx) =>
        this.optionRepository.create({
          questionId,
          optionText: opt.optionText.trim(),
          isCorrect: opt.isCorrect,
          displayOrder: opt.displayOrder ?? idx,
        }),
      );
      question.options = await this.optionRepository.save(newOptions);
    }

    if (dto.questionText !== undefined) {
      question.questionText = dto.questionText.trim();
    }
    if (dto.questionType !== undefined) {
      question.questionType = dto.questionType;
    }
    if (dto.points !== undefined) {
      question.points = dto.points;
    }
    if (dto.displayOrder !== undefined) {
      question.displayOrder = dto.displayOrder;
    }
    if (dto.explanation !== undefined) {
      question.explanation = dto.explanation ? dto.explanation.trim() : null;
    }

    const updated = await this.questionRepository.save(question);
    this.logger.log(`Updated Question [${questionId}] by Instructor [${instructorId}]`);

    return updated.toSafeQuestion(true);
  }

  async deleteQuestion(
    instructorId: string,
    questionId: string,
  ): Promise<{ message: string }> {
    const question = await this.validateInstructorQuestionOwnership(
      instructorId,
      questionId,
    );

    const attemptsCount = await this.attemptRepository.count({
      where: { quizId: question.quizId },
    });

    if (attemptsCount > 0) {
      throw new BadRequestException(
        'Cannot delete question because student attempts already exist for this quiz',
      );
    }

    await this.questionRepository.remove(question);
    this.logger.log(`Deleted Question [${questionId}] by Instructor [${instructorId}]`);

    return { message: 'Question successfully deleted' };
  }

  // ==========================================
  // STUDENT QUIZ ACCESS AND ATTEMPTS
  // ==========================================

  async getQuizForStudent(
    studentId: string,
    quizId: string,
  ): Promise<SafeQuizDto> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: {
        lesson: { section: { course: true } },
        questions: { options: true },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID "${quizId}" not found`);
    }

    if (!quiz.isPublished) {
      throw new NotFoundException('Quiz not found or is not published');
    }

    const course = quiz.lesson?.section?.course;
    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException('Quiz not found or course is not published');
    }

    const hasAccess = await this.enrollmentsService.hasAccessToCourse(
      studentId,
      course.id,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Active course enrollment and verified payment are required to access this quiz',
      );
    }

    return quiz.toSafeQuiz(false);
  }

  async startAttempt(
    studentId: string,
    quizId: string,
  ): Promise<SafeQuizAttemptDto> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: {
        lesson: { section: { course: true } },
        questions: { options: true },
      },
    });

    const course = quiz?.lesson?.section?.course;
    if (!quiz || !quiz.isPublished) {
      throw new NotFoundException('Quiz not found or is not published');
    }

    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException('Quiz not found or course is not published');
    }

    const hasAccess = await this.enrollmentsService.hasAccessToCourse(
      studentId,
      course.id,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Active course enrollment and verified payment are required to start a quiz attempt',
      );
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      throw new BadRequestException('This quiz has no questions available yet');
    }

    const existingAttempts = await this.attemptRepository.find({
      where: { quizId, studentId },
      order: { attemptNumber: 'ASC' },
    });

    // Check if an existing attempt is currently in progress
    const activeAttempt = existingAttempts.find(
      (a) => a.status === QuizAttemptStatus.IN_PROGRESS,
    );

    if (activeAttempt) {
      const startedTime = new Date(activeAttempt.startedAt).getTime();
      if (quiz.timeLimitMinutes) {
        const deadline =
          startedTime +
          (quiz.timeLimitMinutes * 60 + 10) * 1000;
        if (Date.now() > deadline) {
          activeAttempt.status = QuizAttemptStatus.EXPIRED;
          await this.attemptRepository.save(activeAttempt);
        } else {
          throw new BadRequestException(
            'An active quiz attempt is already in progress. Please complete or submit it first.',
          );
        }
      } else {
        throw new BadRequestException(
          'An active quiz attempt is already in progress. Please complete or submit it first.',
        );
      }
    }

    if (existingAttempts.length >= quiz.maxAttempts) {
      throw new BadRequestException(
        `Maximum attempts limit reached for this quiz (Allowed: ${quiz.maxAttempts})`,
      );
    }

    const maxScore = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0);

    const attempt = this.attemptRepository.create({
      quizId,
      studentId,
      attemptNumber: existingAttempts.length + 1,
      status: QuizAttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      score: 0,
      maxScore,
      percentage: 0,
      isPassed: false,
    });

    const saved = await this.attemptRepository.save(attempt);
    this.logger.log(
      `Started QuizAttempt [${saved.id}] for Student [${studentId}], Quiz [${quizId}] (Attempt #${saved.attemptNumber})`,
    );

    return saved.toSafeAttempt();
  }

  async getAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<SafeQuizAttemptDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: {
        quiz: { lesson: { section: { course: true } } },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with ID "${attemptId}" not found`);
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view another student’s quiz attempt',
      );
    }

    if (
      attempt.status === QuizAttemptStatus.IN_PROGRESS &&
      attempt.quiz.timeLimitMinutes
    ) {
      const deadline =
        attempt.startedAt.getTime() +
        (attempt.quiz.timeLimitMinutes * 60 + 10) * 1000;
      if (Date.now() > deadline) {
        attempt.status = QuizAttemptStatus.EXPIRED;
        await this.attemptRepository.save(attempt);
      }
    }

    return attempt.toSafeAttempt();
  }

  // ==========================================
  // ATTEMPT SUBMISSION AND AUTO-GRADING
  // ==========================================

  async submitAttempt(
    studentId: string,
    attemptId: string,
    dto: SubmitQuizAttemptDto,
  ): Promise<SafeQuizAttemptDto> {
    return this.dataSource.transaction(async (manager) => {
      const attempt = await manager.findOne(QuizAttempt, {
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!attempt) {
        throw new NotFoundException(`Quiz attempt with ID "${attemptId}" not found`);
      }

      if (attempt.studentId !== studentId) {
        throw new ForbiddenException(
          'Access denied: You cannot submit another student’s quiz attempt',
        );
      }

      const quiz = await manager.findOne(Quiz, {
        where: { id: attempt.quizId },
        relations: { questions: { options: true } },
      });

      if (!quiz) {
        throw new NotFoundException('Quiz associated with this attempt was not found');
      }
      attempt.quiz = quiz;

      if (attempt.status === QuizAttemptStatus.SUBMITTED) {
        throw new BadRequestException(
          'Quiz attempt has already been submitted and graded',
        );
      }

      if (attempt.status === QuizAttemptStatus.EXPIRED) {
        throw new BadRequestException(
          'Quiz attempt time limit has expired and can no longer be submitted',
        );
      }

      // Enforce server-side time limit check
      if (attempt.quiz.timeLimitMinutes) {
        const deadline =
          attempt.startedAt.getTime() +
          (attempt.quiz.timeLimitMinutes * 60 + 10) * 1000;
        if (Date.now() > deadline) {
          attempt.status = QuizAttemptStatus.EXPIRED;
          await manager.save(QuizAttempt, attempt);
          throw new BadRequestException(
            'Quiz attempt time limit has expired and can no longer be submitted',
          );
        }
      }

      const questions = attempt.quiz.questions || [];
      const questionMap = new Map(questions.map((q) => [q.id, q]));

      // Validate submitted answer consistency
      const submittedQuestionIds = new Set<string>();
      for (const ans of dto.answers || []) {
        if (!questionMap.has(ans.questionId)) {
          throw new BadRequestException(
            `Question with ID "${ans.questionId}" does not belong to this quiz`,
          );
        }

        if (submittedQuestionIds.has(ans.questionId)) {
          throw new BadRequestException(
            `Duplicate answer submitted for question "${ans.questionId}"`,
          );
        }
        submittedQuestionIds.add(ans.questionId);

        if (ans.selectedOptionId) {
          const q = questionMap.get(ans.questionId)!;
          const optionExists = q.options.some((o) => o.id === ans.selectedOptionId);
          if (!optionExists) {
            throw new BadRequestException(
              `Selected option "${ans.selectedOptionId}" does not belong to question "${ans.questionId}"`,
            );
          }
        }
      }

      // Server-side Objective Auto-Grading Engine
      let totalAwarded = 0;
      const studentAnswers: StudentAnswer[] = [];

      for (const question of questions) {
        const submission = (dto.answers || []).find((a) => a.questionId === question.id);
        let awardedPoints = 0;
        let isCorrect = false;
        let selectedOptionId: string | null = null;

        if (submission && submission.selectedOptionId) {
          selectedOptionId = submission.selectedOptionId;
          const correctOption = question.options.find((o) => o.isCorrect);

          if (correctOption && correctOption.id === selectedOptionId) {
            awardedPoints = question.points;
            isCorrect = true;
          }
        }

        totalAwarded += awardedPoints;

        const studentAns = manager.create(StudentAnswer, {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId,
          awardedPoints,
          isCorrect,
        });

        studentAnswers.push(studentAns);
      }

      const maxScore = questions.reduce((sum, q) => sum + (q.points || 0), 0);
      const percentage =
        maxScore > 0 ? Number(((totalAwarded / maxScore) * 100).toFixed(2)) : 0;
      const isPassed = percentage >= attempt.quiz.passingScore;

      const savedAnswers = await manager.save(StudentAnswer, studentAnswers);

      attempt.status = QuizAttemptStatus.SUBMITTED;
      attempt.submittedAt = new Date();
      attempt.score = totalAwarded;
      attempt.maxScore = maxScore;
      attempt.percentage = percentage;
      attempt.isPassed = isPassed;
      attempt.answers = savedAnswers;

      const savedAttempt = await manager.save(QuizAttempt, attempt);

      this.logger.log(
        `Graded QuizAttempt [${savedAttempt.id}] for Student [${studentId}]: Score=${totalAwarded}/${maxScore} (${percentage}%), Passed=${isPassed}`,
      );

      // Fire in-app notification (non-blocking, outside transaction so failures don't abort)
      const notifType = isPassed ? NotificationType.QUIZ_PASSED : NotificationType.QUIZ_FAILED;
      void this.notificationsService.createNotification({
        userId: studentId,
        type: notifType,
        title: `Quiz result: ${attempt.quiz.title}`,
        message: `You scored ${totalAwarded}/${maxScore} (${percentage}%) — ${isPassed ? 'Passed ✅' : 'Not passed ❌'}`,
        actionUrl: `/student/courses`,
        metadata: {
          quizId: attempt.quizId,
          attemptId: savedAttempt.id,
          score: totalAwarded,
          maxScore,
          percentage,
          isPassed,
        },
      });

      return savedAttempt.toSafeAttempt();
    });
  }
}
