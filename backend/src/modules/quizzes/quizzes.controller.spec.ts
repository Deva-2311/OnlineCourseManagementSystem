/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { InstructorQuizzesController } from './controllers/instructor-quizzes.controller';
import { QuizzesController } from './controllers/quizzes.controller';
import { QuizAttemptsController } from './controllers/quiz-attempts.controller';
import { QuizzesService } from './quizzes.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { QuestionType } from './enums/question-type.enum';

describe('Quizzes Controllers', () => {
  let instructorController: InstructorQuizzesController;
  let quizzesController: QuizzesController;
  let attemptsController: QuizAttemptsController;
  let service: any;

  const mockInstructor: Partial<User> = {
    id: 'inst-1',
    role: UserRole.INSTRUCTOR,
    email: 'instructor@ocms.com',
  };

  const mockStudent: Partial<User> = {
    id: 'stud-1',
    role: UserRole.STUDENT,
    email: 'student@ocms.com',
  };

  const mockQuiz = {
    id: 'quiz-1',
    title: 'Distributed Storage Quiz',
    isPublished: true,
  };

  const mockAttempt = {
    id: 'att-1',
    quizId: 'quiz-1',
    studentId: 'stud-1',
    status: 'IN_PROGRESS',
  };

  beforeEach(async () => {
    service = {
      createQuiz: jest.fn().mockResolvedValue(mockQuiz),
      findLessonQuizzesForInstructor: jest.fn().mockResolvedValue([mockQuiz]),
      findQuizByIdForInstructor: jest.fn().mockResolvedValue(mockQuiz),
      updateQuiz: jest.fn().mockResolvedValue({ ...mockQuiz, title: 'Updated' }),
      deleteQuiz: jest.fn().mockResolvedValue({ message: 'Quiz successfully deleted' }),
      createQuestion: jest.fn().mockResolvedValue({ id: 'q-1', questionText: 'Q1' }),
      updateQuestion: jest.fn().mockResolvedValue({ id: 'q-1', questionText: 'Updated Q1' }),
      deleteQuestion: jest.fn().mockResolvedValue({ message: 'Question successfully deleted' }),
      getQuizForStudent: jest.fn().mockResolvedValue(mockQuiz),
      startAttempt: jest.fn().mockResolvedValue(mockAttempt),
      getAttempt: jest.fn().mockResolvedValue(mockAttempt),
      submitAttempt: jest.fn().mockResolvedValue({ ...mockAttempt, status: 'SUBMITTED', score: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        InstructorQuizzesController,
        QuizzesController,
        QuizAttemptsController,
      ],
      providers: [
        {
          provide: QuizzesService,
          useValue: service,
        },
      ],
    }).compile();

    instructorController = module.get<InstructorQuizzesController>(
      InstructorQuizzesController,
    );
    quizzesController = module.get<QuizzesController>(QuizzesController);
    attemptsController = module.get<QuizAttemptsController>(QuizAttemptsController);
  });

  describe('InstructorQuizzesController', () => {
    it('should create a quiz via service', async () => {
      const res = await instructorController.createQuiz(
        mockInstructor as User,
        'lesson-1',
        { title: 'New Quiz' },
      );
      expect(service.createQuiz).toHaveBeenCalledWith('inst-1', 'lesson-1', { title: 'New Quiz' });
      expect(res).toEqual(mockQuiz);
    });

    it('should create a question via service', async () => {
      const dto = {
        questionText: 'Is replication required?',
        questionType: QuestionType.TRUE_FALSE,
        points: 1,
        options: [
          { optionText: 'True', isCorrect: true },
          { optionText: 'False', isCorrect: false },
        ],
      };
      await instructorController.createQuestion(mockInstructor as User, 'quiz-1', dto);
      expect(service.createQuestion).toHaveBeenCalledWith('inst-1', 'quiz-1', dto);
    });

    it('should update and delete quiz via service', async () => {
      await instructorController.updateQuiz(mockInstructor as User, 'quiz-1', { title: 'Updated' });
      expect(service.updateQuiz).toHaveBeenCalledWith('inst-1', 'quiz-1', { title: 'Updated' });

      await instructorController.deleteQuiz(mockInstructor as User, 'quiz-1');
      expect(service.deleteQuiz).toHaveBeenCalledWith('inst-1', 'quiz-1');
    });
  });

  describe('QuizzesController', () => {
    it('should return safe quiz for student', async () => {
      const res = await quizzesController.getQuiz(mockStudent as User, 'quiz-1');
      expect(service.getQuizForStudent).toHaveBeenCalledWith('stud-1', 'quiz-1');
      expect(res).toEqual(mockQuiz);
    });

    it('should start an attempt for student', async () => {
      const res = await quizzesController.startAttempt(mockStudent as User, 'quiz-1');
      expect(service.startAttempt).toHaveBeenCalledWith('stud-1', 'quiz-1');
      expect(res).toEqual(mockAttempt);
    });
  });

  describe('QuizAttemptsController', () => {
    it('should get an attempt via service', async () => {
      const res = await attemptsController.getAttempt(mockStudent as User, 'att-1');
      expect(service.getAttempt).toHaveBeenCalledWith('stud-1', 'att-1');
      expect(res).toEqual(mockAttempt);
    });

    it('should submit an attempt via service', async () => {
      const dto = { answers: [] };
      const res = await attemptsController.submitAttempt(mockStudent as User, 'att-1', dto);
      expect(service.submitAttempt).toHaveBeenCalledWith('stud-1', 'att-1', dto);
      expect(res.status).toBe('SUBMITTED');
    });
  });
});
