import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearningInsightsService } from './learning-insights.service';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { SkillProficiencyStatus } from './enums/skill-proficiency-status.enum';
import { LearningStepType } from './enums/learning-step-type.enum';
import { AccessStatus } from './enums/access-status.enum';

describe('LearningInsightsService', () => {
  let service: LearningInsightsService;
  let attemptRepository: any;
  let quizRepository: any;
  let skillRepository: any;
  let enrollmentRepository: any;
  let progressRepository: any;
  let courseRepository: any;
  let paymentRepository: any;

  const studentId = 'student-uuid-1';

  beforeEach(async () => {
    attemptRepository = {
      find: jest.fn(),
    };
    quizRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    skillRepository = {
      find: jest.fn(),
    };
    enrollmentRepository = {
      find: jest.fn(),
    };
    progressRepository = {
      find: jest.fn(),
    };
    courseRepository = {
      find: jest.fn(),
    };
    paymentRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningInsightsService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: attemptRepository,
        },
        {
          provide: getRepositoryToken(Quiz),
          useValue: quizRepository,
        },
        {
          provide: getRepositoryToken(Skill),
          useValue: skillRepository,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepository,
        },
        {
          provide: getRepositoryToken(LessonProgress),
          useValue: progressRepository,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
      ],
    }).compile();

    service = module.get<LearningInsightsService>(LearningInsightsService);
  });

  describe('getLearningInsightsForStudent', () => {
    it('should return empty analysis and summary when student has no submitted quiz attempts', async () => {
      attemptRepository.find.mockResolvedValue([]);

      const result = await service.getLearningInsightsForStudent(studentId);

      expect(result.summary.totalSkillsAssessed).toBe(0);
      expect(result.summary.strongSkillsCount).toBe(0);
      expect(result.summary.developingSkillsCount).toBe(0);
      expect(result.summary.needsImprovementCount).toBe(0);
      expect(result.summary.insufficientDataCount).toBe(0);
      expect(result.skills).toEqual([]);
    });

    it('should classify skills correctly based on empirical score thresholds and minimum evidence', async () => {
      const skillStrong: Partial<Skill> = { id: 'sk-1', name: 'SQL Querying' };
      const skillDeveloping: Partial<Skill> = { id: 'sk-2', name: 'Database Normalization' };
      const skillNeedsImprovement: Partial<Skill> = { id: 'sk-3', name: 'Indexing & Query Plans' };
      const skillInsufficient: Partial<Skill> = { id: 'sk-4', name: 'Transactions & ACID' };

      const mockAttempt: any = {
        id: 'attempt-1',
        quizId: 'quiz-1',
        studentId,
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date('2026-02-01T10:00:00Z'),
        answers: [
          // Skill 1 (Strong): 2 questions, 2 correct = 100%
          { isCorrect: true, question: { skillId: 'sk-1', skill: skillStrong } },
          { isCorrect: true, question: { skillId: 'sk-1', skill: skillStrong } },
          // Skill 2 (Developing): 3 questions, 2 correct = 66.7%
          { isCorrect: true, question: { skillId: 'sk-2', skill: skillDeveloping } },
          { isCorrect: false, question: { skillId: 'sk-2', skill: skillDeveloping } },
          { isCorrect: true, question: { skillId: 'sk-2', skill: skillDeveloping } },
          // Skill 3 (Needs Improvement): 3 questions, 1 correct = 33.3%
          { isCorrect: true, question: { skillId: 'sk-3', skill: skillNeedsImprovement } },
          { isCorrect: false, question: { skillId: 'sk-3', skill: skillNeedsImprovement } },
          { isCorrect: false, question: { skillId: 'sk-3', skill: skillNeedsImprovement } },
          // Skill 4 (Insufficient Data): 1 question only (< 2)
          { isCorrect: true, question: { skillId: 'sk-4', skill: skillInsufficient } },
        ],
      };

      attemptRepository.find.mockResolvedValue([mockAttempt]);

      const result = await service.getLearningInsightsForStudent(studentId);

      expect(result.summary.totalSkillsAssessed).toBe(4);
      expect(result.summary.strongSkillsCount).toBe(1);
      expect(result.summary.developingSkillsCount).toBe(1);
      expect(result.summary.needsImprovementCount).toBe(1);
      expect(result.summary.insufficientDataCount).toBe(1);

      const strongItem = result.skills.find((s) => s.skillId === 'sk-1');
      expect(strongItem?.status).toBe(SkillProficiencyStatus.STRONG);
      expect(strongItem?.masteryScore).toBe(100);

      const devItem = result.skills.find((s) => s.skillId === 'sk-2');
      expect(devItem?.status).toBe(SkillProficiencyStatus.DEVELOPING);
      expect(devItem?.masteryScore).toBe(67);

      const needsImpItem = result.skills.find((s) => s.skillId === 'sk-3');
      expect(needsImpItem?.status).toBe(SkillProficiencyStatus.NEEDS_IMPROVEMENT);
      expect(needsImpItem?.masteryScore).toBe(33);

      const insufItem = result.skills.find((s) => s.skillId === 'sk-4');
      expect(insufItem?.status).toBe(SkillProficiencyStatus.INSUFFICIENT_DATA);
      expect(insufItem?.masteryScore).toBeNull();
      expect(insufItem?.totalQuestionsAttempted).toBe(1);
    });

    it('should handle retakes by utilizing only the latest submitted attempt per quiz without double-counting', async () => {
      const skill1: Partial<Skill> = { id: 'sk-alg', name: 'Sorting Algorithms' };

      // Earlier attempt: 0/2 correct
      const attemptEarly: any = {
        id: 'attempt-early',
        quizId: 'quiz-sorting',
        studentId,
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date('2026-01-01T10:00:00Z'),
        answers: [
          { isCorrect: false, question: { skillId: 'sk-alg', skill: skill1 } },
          { isCorrect: false, question: { skillId: 'sk-alg', skill: skill1 } },
        ],
      };

      // Latest retake attempt: 2/2 correct
      const attemptLatest: any = {
        id: 'attempt-latest',
        quizId: 'quiz-sorting',
        studentId,
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date('2026-01-05T12:00:00Z'),
        answers: [
          { isCorrect: true, question: { skillId: 'sk-alg', skill: skill1 } },
          { isCorrect: true, question: { skillId: 'sk-alg', skill: skill1 } },
        ],
      };

      // Mock returns ordered by submittedAt DESC
      attemptRepository.find.mockResolvedValue([attemptLatest, attemptEarly]);

      const result = await service.getLearningInsightsForStudent(studentId);

      // Latest attempt has 2 questions, 2 correct = 100% STRONG, total questions counted = 2 (not 4)
      expect(result.summary.totalSkillsAssessed).toBe(1);
      const skillItem = result.skills[0];
      expect(skillItem.totalQuestionsAttempted).toBe(2);
      expect(skillItem.correctAnswersCount).toBe(2);
      expect(skillItem.masteryScore).toBe(100);
      expect(skillItem.status).toBe(SkillProficiencyStatus.STRONG);
    });
  });

  describe('getAdaptiveLearningPathForStudent', () => {
    it('should generate fallback recommendations for students with no gaps and no enrollments', async () => {
      attemptRepository.find.mockResolvedValue([]);
      enrollmentRepository.find.mockResolvedValue([]);
      paymentRepository.find.mockResolvedValue([]);
      progressRepository.find.mockResolvedValue([]);
      quizRepository.find.mockResolvedValue([]);

      const mockPublishedCourse: any = {
        id: 'pub-course-1',
        title: 'Foundations of Computer Science',
        shortDescription: 'Core fundamentals course.',
        price: 0,
        currency: 'USD',
        status: CourseStatus.PUBLISHED,
        createdAt: new Date(),
        sections: [
          {
            id: 'sec-1',
            title: 'Module 1',
            displayOrder: 0,
            lessons: [
              { id: 'les-1', title: 'Binary Math', displayOrder: 0, skills: [] },
            ],
          },
        ],
      };
      courseRepository.find.mockResolvedValue([mockPublishedCourse]);

      const result = await service.getAdaptiveLearningPathForStudent(studentId);

      expect(result.meta.isFallback).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].stepType).toBe(LearningStepType.RECOMMENDED_COURSE);
      expect(result.data[0].accessStatus).toBe(AccessStatus.ENROLLMENT_REQUIRED);
    });

    it('should generate prioritized remedial lessons and practice quizzes for identified skill gaps', async () => {
      const gapSkill: Partial<Skill> = { id: 'sk-gap-1', name: 'Recursion' };

      // 1. Student has a poor quiz attempt in Recursion (< 50%)
      const mockAttempt: any = {
        id: 'att-1',
        quizId: 'quiz-rec-1',
        studentId,
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        answers: [
          { isCorrect: false, question: { skillId: 'sk-gap-1', skill: gapSkill } },
          { isCorrect: false, question: { skillId: 'sk-gap-1', skill: gapSkill } },
        ],
      };

      // 2. Mock attemptRepository for insights & passed quiz checks
      attemptRepository.find.mockImplementation((options: any) => {
        if (options?.where?.status === QuizAttemptStatus.SUBMITTED) {
          return Promise.resolve([mockAttempt]);
        }
        if (options?.where?.isPassed === true) {
          return Promise.resolve([]); // No passed quizzes
        }
        return Promise.resolve([]);
      });

      // 3. Enrolled course with a lesson teaching Recursion
      const enrolledCourse: any = {
        id: 'course-enrolled-1',
        title: 'Data Structures & Algorithms',
        price: 0,
        currency: 'USD',
        status: CourseStatus.PUBLISHED,
        sections: [
          {
            id: 'sec-dsa-1',
            title: 'Section 1: Recursion & Backtracking',
            displayOrder: 0,
            lessons: [
              {
                id: 'les-rec-1',
                title: 'Recursive Call Stacks & Base Cases',
                description: 'Deep dive into recursion.',
                displayOrder: 0,
                skills: [gapSkill],
              },
            ],
          },
        ],
      };

      enrollmentRepository.find.mockResolvedValue([
        {
          id: 'enr-1',
          studentId,
          courseId: 'course-enrolled-1',
          status: EnrollmentStatus.ACTIVE,
          course: enrolledCourse,
        },
      ]);

      paymentRepository.find.mockResolvedValue([]);
      progressRepository.find.mockResolvedValue([]);

      // Practice quiz available
      quizRepository.find.mockResolvedValue([
        {
          id: 'quiz-rec-practice',
          title: 'Recursion Diagnostics Quiz',
          isPublished: true,
          lesson: {
            id: 'les-rec-1',
            section: { course: enrolledCourse },
          },
          questions: [
            { id: 'q-1', skillId: 'sk-gap-1', skill: gapSkill },
          ],
        },
      ]);

      const result = await service.getAdaptiveLearningPathForStudent(studentId);

      expect(result.meta.isFallback).toBe(false);
      expect(result.meta.hasSkillGaps).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Verify Remedial Lesson is present
      const remedialStep = result.data.find((s) => s.stepType === LearningStepType.REMEDIAL_LESSON);
      expect(remedialStep).toBeDefined();
      expect(remedialStep?.accessStatus).toBe(AccessStatus.ACCESSIBLE);
      expect(remedialStep?.targetSkill?.name).toBe('Recursion');

      // Verify Practice Quiz is present
      const quizStep = result.data.find((s) => s.stepType === LearningStepType.PRACTICE_QUIZ);
      expect(quizStep).toBeDefined();
      expect(quizStep?.accessStatus).toBe(AccessStatus.ACCESSIBLE);
    });

    it('should distinguish paid courses requiring payment from accessible enrolled content', async () => {
      const gapSkill: Partial<Skill> = { id: 'sk-cloud', name: 'Cloud Architecture' };

      const mockAttempt: any = {
        id: 'att-cloud-1',
        quizId: 'quiz-cloud-1',
        studentId,
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        answers: [
          { isCorrect: false, question: { skillId: 'sk-cloud', skill: gapSkill } },
          { isCorrect: false, question: { skillId: 'sk-cloud', skill: gapSkill } },
        ],
      };

      attemptRepository.find.mockImplementation((options: any) => {
        if (options?.where?.status === QuizAttemptStatus.SUBMITTED) {
          return Promise.resolve([mockAttempt]);
        }
        return Promise.resolve([]);
      });

      // Paid course ($99.99) where student is enrolled but payment has not succeeded
      const paidCourse: any = {
        id: 'course-paid-1',
        title: 'Advanced Cloud Systems',
        price: 99.99,
        currency: 'USD',
        status: CourseStatus.PUBLISHED,
        sections: [
          {
            id: 'sec-cloud-1',
            displayOrder: 0,
            lessons: [
              {
                id: 'les-cloud-1',
                title: 'High Availability Distributed Systems',
                displayOrder: 0,
                skills: [gapSkill],
              },
            ],
          },
        ],
      };

      enrollmentRepository.find.mockResolvedValue([
        {
          id: 'enr-paid-1',
          studentId,
          courseId: 'course-paid-1',
          status: EnrollmentStatus.ACTIVE,
          course: paidCourse,
        },
      ]);

      // No successful payment
      paymentRepository.find.mockResolvedValue([]);
      progressRepository.find.mockResolvedValue([]);
      quizRepository.find.mockResolvedValue([]);

      const result = await service.getAdaptiveLearningPathForStudent(studentId);

      const remedialStep = result.data.find((s) => s.stepType === LearningStepType.REMEDIAL_LESSON);
      expect(remedialStep).toBeDefined();
      // Since course price > 0 and no succeeded payment exists, accessStatus MUST be PAYMENT_REQUIRED
      expect(remedialStep?.accessStatus).toBe(AccessStatus.PAYMENT_REQUIRED);
    });
  });
});
