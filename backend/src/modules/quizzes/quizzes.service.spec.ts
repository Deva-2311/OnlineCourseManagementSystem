/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
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
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';

describe('QuizzesService', () => {
  let service: QuizzesService;
  let quizRepository: any;
  let questionRepository: any;
  let optionRepository: any;
  let attemptRepository: any;
  let answerRepository: any;
  let lessonRepository: any;
  let courseRepository: any;
  let enrollmentsService: any;
  let dataSource: any;

  const mockCourse: Partial<Course> = {
    id: 'course-1',
    title: 'Distributed Systems',
    instructorId: 'inst-1',
    status: CourseStatus.PUBLISHED,
  };

  const mockLesson: any = {
    id: 'lesson-1',
    title: 'Consistency Models',
    sectionId: 'sec-1',
    section: {
      id: 'sec-1',
      courseId: 'course-1',
      course: mockCourse,
    },
  };

  const mockQuiz: any = {
    id: 'quiz-1',
    lessonId: 'lesson-1',
    title: 'Consistency Quiz',
    instructions: 'Answer all questions carefully',
    timeLimitMinutes: 15,
    maxAttempts: 2,
    passingScore: 70.0,
    isPublished: true,
    lesson: mockLesson,
    questions: [],
    toSafeQuiz: function (includeAnswerKey = false) {
      return {
        id: this.id,
        lessonId: this.lessonId,
        title: this.title,
        instructions: this.instructions,
        timeLimitMinutes: this.timeLimitMinutes,
        maxAttempts: this.maxAttempts,
        passingScore: this.passingScore,
        isPublished: this.isPublished,
        totalPoints: (this.questions || []).reduce((s: number, q: any) => s + (q.points || 0), 0),
        questionsCount: (this.questions || []).length,
        questions: (this.questions || []).map((q: any) => q.toSafeQuestion(includeAnswerKey)),
      };
    },
  };

  const mockOption1: any = {
    id: 'opt-1',
    questionId: 'q-1',
    optionText: 'Linearizability',
    isCorrect: true,
    displayOrder: 0,
    toSafeOption: function (includeAnswerKey = false) {
      return {
        id: this.id,
        questionId: this.questionId,
        optionText: this.optionText,
        displayOrder: this.displayOrder,
        isCorrect: includeAnswerKey ? this.isCorrect : undefined,
      };
    },
  };

  const mockOption2: any = {
    id: 'opt-2',
    questionId: 'q-1',
    optionText: 'Eventual consistency',
    isCorrect: false,
    displayOrder: 1,
    toSafeOption: function (includeAnswerKey = false) {
      return {
        id: this.id,
        questionId: this.questionId,
        optionText: this.optionText,
        displayOrder: this.displayOrder,
        isCorrect: includeAnswerKey ? this.isCorrect : undefined,
      };
    },
  };

  const mockQuestion: any = {
    id: 'q-1',
    quizId: 'quiz-1',
    questionText: 'Which model provides real-time wall clock ordering?',
    questionType: QuestionType.MULTIPLE_CHOICE,
    points: 10,
    displayOrder: 0,
    explanation: 'Linearizability provides strict real-time ordering.',
    options: [mockOption1, mockOption2],
    quiz: mockQuiz,
    toSafeQuestion: function (includeAnswerKey = false) {
      return {
        id: this.id,
        quizId: this.quizId,
        questionText: this.questionText,
        questionType: this.questionType,
        points: this.points,
        displayOrder: this.displayOrder,
        explanation: includeAnswerKey ? this.explanation : undefined,
        options: (this.options || []).map((o: any) => o.toSafeOption(includeAnswerKey)),
      };
    },
  };

  mockQuiz.questions = [mockQuestion];

  beforeEach(async () => {
    quizRepository = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'quiz-new',
        toSafeQuiz: mockQuiz.toSafeQuiz,
      })),
      save: jest.fn().mockImplementation(async (q) => ({
        ...q,
        id: q.id || 'quiz-new',
        toSafeQuiz: mockQuiz.toSafeQuiz,
      })),
      find: jest.fn().mockResolvedValue([mockQuiz]),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === 'quiz-1') return { ...mockQuiz };
        return null;
      }),
      remove: jest.fn().mockResolvedValue(mockQuiz),
    };

    questionRepository = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'q-new',
        toSafeQuestion: mockQuestion.toSafeQuestion,
      })),
      save: jest.fn().mockImplementation(async (q) => ({
        ...q,
        id: q.id || 'q-new',
        toSafeQuestion: mockQuestion.toSafeQuestion,
      })),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === 'q-1') return { ...mockQuestion };
        return null;
      }),
      remove: jest.fn().mockResolvedValue(mockQuestion),
    };

    optionRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'opt-new' })),
      save: jest.fn().mockImplementation(async (opts) => opts),
      delete: jest.fn().mockResolvedValue({ affected: 2 }),
    };

    attemptRepository = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'att-1',
        toSafeAttempt: function () {
          return {
            id: this.id,
            quizId: this.quizId,
            studentId: this.studentId,
            attemptNumber: this.attemptNumber,
            status: this.status,
            startedAt: this.startedAt,
            submittedAt: this.submittedAt,
            score: this.score,
            maxScore: this.maxScore,
            percentage: this.percentage,
            isPassed: this.isPassed,
          };
        },
      })),
      save: jest.fn().mockImplementation(async (a) => ({
        ...a,
        id: a.id || 'att-1',
        toSafeAttempt: function () {
          return {
            id: this.id,
            quizId: this.quizId,
            studentId: this.studentId,
            attemptNumber: this.attemptNumber,
            status: this.status,
            startedAt: this.startedAt,
            submittedAt: this.submittedAt,
            score: this.score,
            maxScore: this.maxScore,
            percentage: this.percentage,
            isPassed: this.isPassed,
          };
        },
      })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    answerRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'ans-1' })),
      save: jest.fn().mockImplementation(async (ans) => ans),
    };

    lessonRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id === 'lesson-1') return mockLesson;
        return null;
      }),
    };

    courseRepository = {
      findOne: jest.fn().mockResolvedValue(mockCourse),
    };

    enrollmentsService = {
      hasAccessToCourse: jest.fn().mockResolvedValue(true),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          findOne: jest.fn(),
          create: jest.fn().mockImplementation((entityClass, dto) => ({
            ...dto,
            id: 'mock-id',
          })),
          save: jest.fn().mockImplementation(async (entityClassOrEntity, entity) => {
            if (Array.isArray(entityClassOrEntity)) return entityClassOrEntity;
            if (Array.isArray(entity)) return entity;
            return entity || entityClassOrEntity;
          }),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: getRepositoryToken(Quiz), useValue: quizRepository },
        { provide: getRepositoryToken(QuizQuestion), useValue: questionRepository },
        { provide: getRepositoryToken(QuestionOption), useValue: optionRepository },
        { provide: getRepositoryToken(QuizAttempt), useValue: attemptRepository },
        { provide: getRepositoryToken(StudentAnswer), useValue: answerRepository },
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue({}) } },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
  });

  // ==========================================
  // 1. INSTRUCTOR MANAGEMENT & OWNERSHIP
  // ==========================================

  describe('createQuiz', () => {
    it('should allow authorized instructor to create a quiz for their owned lesson', async () => {
      const res = await service.createQuiz('inst-1', 'lesson-1', {
        title: 'Quiz 1: Distributed Storage',
        instructions: 'Read questions carefully',
        timeLimitMinutes: 20,
        maxAttempts: 3,
        passingScore: 75.0,
      });

      expect(res).toBeDefined();
      expect(quizRepository.save).toHaveBeenCalled();
    });

    it('should reject creating quiz if instructor does not own the course', async () => {
      await expect(
        service.createQuiz('other-inst', 'lesson-1', { title: 'Unauthorized Quiz' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject publishing a brand-new quiz without any questions', async () => {
      await expect(
        service.createQuiz('inst-1', 'lesson-1', {
          title: 'Immediate Published Quiz',
          isPublished: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateQuiz & attempt restrictions', () => {
    it('should reject material quiz changes when student attempts already exist', async () => {
      attemptRepository.count.mockResolvedValueOnce(3);

      await expect(
        service.updateQuiz('inst-1', 'quiz-1', { passingScore: 80.0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting a quiz when student attempts already exist', async () => {
      attemptRepository.count.mockResolvedValueOnce(1);

      await expect(service.deleteQuiz('inst-1', 'quiz-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createQuestion validation', () => {
    it('should reject objective question with fewer than 2 options', async () => {
      await expect(
        service.createQuestion('inst-1', 'quiz-1', {
          questionText: 'Single option question?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          options: [{ optionText: 'Only One Option', isCorrect: true }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject objective question without exactly one correct answer', async () => {
      await expect(
        service.createQuestion('inst-1', 'quiz-1', {
          questionText: 'No correct answer option?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          options: [
            { optionText: 'Wrong A', isCorrect: false },
            { optionText: 'Wrong B', isCorrect: false },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject True/False questions that do not have exactly 2 options', async () => {
      await expect(
        service.createQuestion('inst-1', 'quiz-1', {
          questionText: 'Is Paxos consensus algorithm?',
          questionType: QuestionType.TRUE_FALSE,
          points: 1,
          options: [
            { optionText: 'True', isCorrect: true },
            { optionText: 'False', isCorrect: false },
            { optionText: 'Maybe', isCorrect: false },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // 2. STUDENT ACCESS & ANSWER KEY MASKING
  // ==========================================

  describe('getQuizForStudent', () => {
    it('should mask answer keys and explanations from student responses', async () => {
      const studentQuiz = await service.getQuizForStudent('stud-1', 'quiz-1');

      expect(studentQuiz).toBeDefined();
      expect(studentQuiz.title).toBe('Consistency Quiz');
      expect(studentQuiz.questions[0].explanation).toBeUndefined();
      expect(studentQuiz.questions[0].options[0].isCorrect).toBeUndefined();
      expect(studentQuiz.questions[0].options[1].isCorrect).toBeUndefined();
    });

    it('should reject student access when student is not enrolled or payment unverified', async () => {
      enrollmentsService.hasAccessToCourse.mockResolvedValueOnce(false);

      await expect(
        service.getQuizForStudent('stud-unauthorized', 'quiz-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject access to unpublished quiz', async () => {
      quizRepository.findOne.mockResolvedValueOnce({
        ...mockQuiz,
        isPublished: false,
      });

      await expect(
        service.getQuizForStudent('stud-1', 'quiz-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // 3. ATTEMPT ENFORCEMENT & SUBMISSION
  // ==========================================

  describe('startAttempt', () => {
    it('should enforce maximum attempts limit', async () => {
      attemptRepository.find.mockResolvedValueOnce([
        { id: 'att-1', attemptNumber: 1, status: QuizAttemptStatus.SUBMITTED },
        { id: 'att-2', attemptNumber: 2, status: QuizAttemptStatus.SUBMITTED },
      ]);

      await expect(service.startAttempt('stud-1', 'quiz-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject starting attempt if another active attempt is in progress', async () => {
      attemptRepository.find.mockResolvedValueOnce([
        {
          id: 'att-active',
          attemptNumber: 1,
          status: QuizAttemptStatus.IN_PROGRESS,
          startedAt: new Date(), // Just started, not expired
        },
      ]);

      await expect(service.startAttempt('stud-1', 'quiz-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAttempt privacy', () => {
    it('should prevent students from viewing another student’s attempt', async () => {
      attemptRepository.findOne.mockResolvedValueOnce({
        id: 'att-2',
        studentId: 'other-student',
        quiz: mockQuiz,
      });

      await expect(service.getAttempt('my-student', 'att-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('submitAttempt & auto-grading', () => {
    it('should correctly grade correct objective answers and compute percentage and pass status', async () => {
      const activeAttempt: any = {
        id: 'att-1',
        quizId: 'quiz-1',
        studentId: 'stud-1',
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === QuizAttempt) return activeAttempt;
            if (entity === Quiz) return mockQuiz;
            return null;
          }),
          create: jest.fn().mockImplementation((cls, d) => d),
          save: jest.fn().mockImplementation(async (clsOrEntity, entity) => {
            const target = entity || clsOrEntity;
            if (target && target.status) {
              target.toSafeAttempt = () => ({
                id: target.id,
                score: target.score,
                maxScore: target.maxScore,
                percentage: target.percentage,
                isPassed: target.isPassed,
                status: target.status,
              });
            }
            return target;
          }),
        };
        return cb(manager);
      });

      const graded = await service.submitAttempt('stud-1', 'att-1', {
        answers: [{ questionId: 'q-1', selectedOptionId: 'opt-1' }], // opt-1 is correct
      });

      expect(graded.score).toBe(10);
      expect(graded.maxScore).toBe(10);
      expect(graded.percentage).toBe(100);
      expect(graded.isPassed).toBe(true);
      expect(graded.status).toBe(QuizAttemptStatus.SUBMITTED);
    });

    it('should grade incorrect answers with 0 points and mark fail', async () => {
      const activeAttempt: any = {
        id: 'att-1',
        quizId: 'quiz-1',
        studentId: 'stud-1',
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === QuizAttempt) return activeAttempt;
            if (entity === Quiz) return mockQuiz;
            return null;
          }),
          create: jest.fn().mockImplementation((cls, d) => d),
          save: jest.fn().mockImplementation(async (clsOrEntity, entity) => {
            const target = entity || clsOrEntity;
            if (target && target.status) {
              target.toSafeAttempt = () => ({
                id: target.id,
                score: target.score,
                maxScore: target.maxScore,
                percentage: target.percentage,
                isPassed: target.isPassed,
                status: target.status,
              });
            }
            return target;
          }),
        };
        return cb(manager);
      });

      const graded = await service.submitAttempt('stud-1', 'att-1', {
        answers: [{ questionId: 'q-1', selectedOptionId: 'opt-2' }], // opt-2 is incorrect
      });

      expect(graded.score).toBe(0);
      expect(graded.maxScore).toBe(10);
      expect(graded.percentage).toBe(0);
      expect(graded.isPassed).toBe(false);
    });

    it('should reject submission if attempt is already SUBMITTED (prevent duplicate grading)', async () => {
      const alreadySubmitted: any = {
        id: 'att-1',
        studentId: 'stud-1',
        status: QuizAttemptStatus.SUBMITTED,
      };

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === QuizAttempt) return alreadySubmitted;
            if (entity === Quiz) return mockQuiz;
            return null;
          }),
        };
        return cb(manager);
      });

      await expect(
        service.submitAttempt('stud-1', 'att-1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject foreign question IDs that do not belong to the quiz', async () => {
      const activeAttempt: any = {
        id: 'att-1',
        quizId: 'quiz-1',
        studentId: 'stud-1',
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === QuizAttempt) return activeAttempt;
            if (entity === Quiz) return mockQuiz;
            return null;
          }),
        };
        return cb(manager);
      });

      await expect(
        service.submitAttempt('stud-1', 'att-1', {
          answers: [{ questionId: 'foreign-q-id' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if attempt time limit has expired', async () => {
      const expiredAttempt: any = {
        id: 'att-1',
        quizId: 'quiz-1',
        studentId: 'stud-1',
        status: QuizAttemptStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (limit is 15 mins)
      };

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const manager = {
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === QuizAttempt) return expiredAttempt;
            if (entity === Quiz) return mockQuiz;
            return null;
          }),
          save: jest.fn(),
        };
        return cb(manager);
      });

      await expect(
        service.submitAttempt('stud-1', 'att-1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
