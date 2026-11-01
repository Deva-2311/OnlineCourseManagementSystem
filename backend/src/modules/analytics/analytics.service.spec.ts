/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { LessonProgressStatus } from '../progress/enums/lesson-progress-status.enum';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';

const makeRepo = () => ({ count: jest.fn(), find: jest.fn(), findOne: jest.fn() });

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userRepo: any;
  let courseRepo: any;
  let enrollmentRepo: any;
  let paymentRepo: any;
  let certRepo: any;
  let attemptRepo: any;
  let progressRepo: any;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    userRepo = makeRepo();
    courseRepo = makeRepo();
    enrollmentRepo = makeRepo();
    paymentRepo = makeRepo();
    certRepo = makeRepo();
    attemptRepo = makeRepo();
    progressRepo = makeRepo();
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Course), useValue: courseRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Certificate), useValue: certRepo },
        { provide: getRepositoryToken(QuizAttempt), useValue: attemptRepo },
        { provide: getRepositoryToken(LessonProgress), useValue: progressRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // ─── getAdminOverview ──────────────────────────────────────────

  describe('getAdminOverview()', () => {
    it('returns correct metric structure with zero denominators handled', async () => {
      userRepo.count.mockResolvedValue(0);
      courseRepo.count.mockResolvedValue(0);
      enrollmentRepo.count.mockResolvedValue(0);
      certRepo.count.mockResolvedValue(0);
      attemptRepo.count.mockResolvedValue(0);
      dataSource.query.mockResolvedValue([]); // no revenue rows

      const result = await service.getAdminOverview();

      expect(result.users.total).toBe(0);
      expect(result.enrollments.completionRatePercent).toBe(0); // no div-by-zero
      expect(result.quizzes.passRatePercent).toBe(0);
      expect(result.revenue).toEqual([]);
    });

    it('calculates completion rate correctly', async () => {
      enrollmentRepo.count
        .mockResolvedValueOnce(100) // total enrollments
        .mockResolvedValueOnce(50)  // active
        .mockResolvedValueOnce(40); // completed
      userRepo.count.mockResolvedValue(0);
      courseRepo.count.mockResolvedValue(0);
      certRepo.count.mockResolvedValue(0);
      attemptRepo.count.mockResolvedValue(0);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getAdminOverview();
      // completed / total = 40/100 = 40%
      expect(result.enrollments.completionRatePercent).toBe(40);
    });

    it('aggregates revenue by currency without mixing currencies', async () => {
      userRepo.count.mockResolvedValue(0);
      courseRepo.count.mockResolvedValue(0);
      enrollmentRepo.count.mockResolvedValue(0);
      certRepo.count.mockResolvedValue(0);
      attemptRepo.count.mockResolvedValue(0);
      dataSource.query.mockResolvedValue([
        { currency: 'USD', total: '1200.00' },
        { currency: 'EUR', total: '300.00' },
      ]);

      const result = await service.getAdminOverview();
      expect(result.revenue).toHaveLength(2);
      expect(result.revenue[0]).toEqual({ currency: 'USD', total: 1200 });
      expect(result.revenue[1]).toEqual({ currency: 'EUR', total: 300 });
    });
  });

  // ─── getEnrollmentTrends ───────────────────────────────────────

  describe('getEnrollmentTrends()', () => {
    it('returns trend data for 30d period', async () => {
      dataSource.query.mockResolvedValue([
        { day: '2026-09-01', count: '5' },
        { day: '2026-09-02', count: '3' },
      ]);

      const result = await service.getEnrollmentTrends('30d');
      expect(result.period).toBe('30d');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ day: '2026-09-01', count: 5 });
    });

    it('returns empty array when no enrollments in range', async () => {
      dataSource.query.mockResolvedValue([]);
      const result = await service.getEnrollmentTrends('7d');
      expect(result.data).toEqual([]);
    });

    it('throws BadRequestException for custom period missing from/to', async () => {
      await expect(service.getEnrollmentTrends('custom')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when from > to', async () => {
      await expect(
        service.getEnrollmentTrends('custom', '2026-10-10', '2026-09-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getCourseAnalytics ────────────────────────────────────────

  describe('getCourseAnalytics()', () => {
    it('calculates completion rate per course', async () => {
      dataSource.query.mockResolvedValue([
        {
          courseId: 'c1',
          title: 'JS Fundamentals',
          status: 'PUBLISHED',
          totalEnrollments: '10',
          activeEnrollments: '6',
          completedEnrollments: '4',
        },
      ]);

      const result = await service.getCourseAnalytics(20);
      expect(result.data[0].completionRatePercent).toBe(40);
    });

    it('returns 0 completion rate for courses with no enrollments', async () => {
      dataSource.query.mockResolvedValue([
        {
          courseId: 'c2',
          title: 'Empty Course',
          status: 'DRAFT',
          totalEnrollments: '0',
          activeEnrollments: '0',
          completedEnrollments: '0',
        },
      ]);

      const result = await service.getCourseAnalytics(20);
      expect(result.data[0].completionRatePercent).toBe(0);
    });

    it('caps limit at 100', async () => {
      dataSource.query.mockResolvedValue([]);
      await service.getCourseAnalytics(9999);
      const callArgs = dataSource.query.mock.calls[0];
      expect(callArgs[1]).toEqual([100]); // limit capped
    });

    it('applies pagination and filter options properly', async () => {
      dataSource.query.mockResolvedValue([
        {
          courseId: 'c1',
          title: 'Advanced TypeScript',
          status: 'PUBLISHED',
          totalEnrollments: '20',
          activeEnrollments: '15',
          completedEnrollments: '5',
          totalCount: '1',
        },
      ]);

      const result = await service.getCourseAnalytics({
        page: 1,
        limit: 10,
        search: 'TypeScript',
        status: CourseStatus.PUBLISHED,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Advanced TypeScript');
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  // ─── getPaymentAnalytics ───────────────────────────────────────

  describe('getPaymentAnalytics()', () => {
    it('keeps currencies separate in summary', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { currency: 'USD', total: '500', txCount: '5' },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getPaymentAnalytics('30d');
      expect(result.summary).toHaveLength(1);
      expect(result.summary[0].currency).toBe('USD');
      expect(result.summary[0].totalRevenue).toBe(500);
    });
  });

  // ─── getStudentLearningSummary ─────────────────────────────────

  describe('getStudentLearningSummary()', () => {
    it('returns summary with zero quiz pass rate when no attempts', async () => {
      enrollmentRepo.count.mockResolvedValue(0);
      certRepo.count.mockResolvedValue(0);
      attemptRepo.count.mockResolvedValue(0);
      progressRepo.count.mockResolvedValue(0);
      enrollmentRepo.find.mockResolvedValue([]);
      attemptRepo.find.mockResolvedValue([]);
      certRepo.find.mockResolvedValue([]);
      dataSource.query
        .mockResolvedValueOnce([{ avg: null }])  // avgScore
        .mockResolvedValueOnce([]);              // recentActivity

      const result = await service.getStudentLearningSummary('student-1');
      expect(result.quizzes.passRatePercent).toBe(0);
      expect(result.quizzes.averageScorePercent).toBeNull();
      expect(result.courses).toEqual([]);
      expect(result.recentQuizzes).toEqual([]);
      expect(result.certificates.items).toEqual([]);
    });

    it('calculates average score from returned percentage', async () => {
      enrollmentRepo.count.mockResolvedValue(2);
      certRepo.count.mockResolvedValue(1);
      attemptRepo.count
        .mockResolvedValueOnce(4)  // total
        .mockResolvedValueOnce(3); // passed
      progressRepo.count.mockResolvedValue(10);
      enrollmentRepo.find.mockResolvedValue([
        {
          id: 'e1',
          progressPercentage: 75,
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date('2026-01-01'),
          course: { id: 'c1', title: 'Course 1', thumbnail: null },
        },
      ]);
      attemptRepo.find.mockResolvedValue([
        {
          id: 'a1',
          score: 8,
          totalQuestions: 10,
          percentage: 80,
          isPassed: true,
          submittedAt: new Date('2026-01-02'),
          quiz: { id: 'q1', title: 'Quiz 1' },
        },
      ]);
      certRepo.find.mockResolvedValue([
        {
          id: 'cert-1',
          certificateNumber: 'CERT-12345',
          status: 'ACTIVE',
          issuedAt: new Date('2026-01-03'),
          course: { id: 'c1', title: 'Course 1' },
        },
      ]);
      dataSource.query
        .mockResolvedValueOnce([{ avg: '75.5' }])
        .mockResolvedValueOnce([{ day: '2026-01-02', lessonsCompleted: '5' }]);

      const result = await service.getStudentLearningSummary('student-1');
      expect(result.quizzes.averageScorePercent).toBe(75.5);
      expect(result.quizzes.passRatePercent).toBe(75);
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe('Course 1');
      expect(result.courses[0].progressPercentage).toBe(75);
      expect(result.recentQuizzes).toHaveLength(1);
      expect(result.recentQuizzes[0].quizTitle).toBe('Quiz 1');
      expect(result.certificates.items).toHaveLength(1);
      expect(result.certificates.items[0].certificateNumber).toBe('CERT-12345');
      expect(result.recentActivity).toHaveLength(1);
    });
  });

  // ─── getInstructorAnalytics ────────────────────────────────────

  describe('getInstructorAnalytics()', () => {
    it('scopes query to instructorId', async () => {
      dataSource.query.mockResolvedValue([]);
      await service.getInstructorAnalytics('inst-uuid-1');
      const sql: string = dataSource.query.mock.calls[0][0];
      expect(sql).toContain('"instructorId"');
      expect(dataSource.query.mock.calls[0][1]).toEqual(['inst-uuid-1']);
    });

    it('handles null avgQuizScore gracefully', async () => {
      dataSource.query.mockResolvedValue([
        {
          courseId: 'c1',
          title: 'Test',
          status: 'PUBLISHED',
          totalEnrollments: '5',
          activeEnrollments: '3',
          completedEnrollments: '2',
          avgQuizScore: null,
          quizAttempts: '0',
        },
      ]);

      const result = await service.getInstructorAnalytics('inst-1');
      expect(result.data[0].averageQuizScorePercent).toBeNull();
      expect(result.summary.totalCourses).toBe(1);
      expect(result.summary.totalEnrollments).toBe(5);
    });
  });

  // ─── getInstructorCourseDetail ─────────────────────────────────

  describe('getInstructorCourseDetail()', () => {
    it('throws NotFoundException when course does not exist', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getInstructorCourseDetail('inst-1', 'non-existent-course'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when instructor does not own the course', async () => {
      courseRepo.findOne.mockResolvedValue({
        id: 'c-10',
        instructorId: 'inst-other',
      });

      await expect(
        service.getInstructorCourseDetail('inst-1', 'c-10'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns course details, lesson stats, and quiz distribution for authorized owner', async () => {
      courseRepo.findOne.mockResolvedValue({
        id: 'c-10',
        title: 'Mastering NestJS',
        status: CourseStatus.PUBLISHED,
        price: 99.99,
        currency: 'USD',
        instructorId: 'inst-1',
        createdAt: new Date('2026-01-01'),
      });

      dataSource.query
        .mockResolvedValueOnce([
          { total: '20', active: '15', completed: '5' },
        ]) // enrollment stats
        .mockResolvedValueOnce([
          { totalLessons: '10', completedProgress: '50' },
        ]) // lesson stats
        .mockResolvedValueOnce([
          {
            totalQuizzes: '2',
            totalAttempts: '12',
            passedAttempts: '9',
            avgScore: '82.5',
            failing: '1',
            average: '2',
            good: '5',
            excellent: '4',
          },
        ]); // quiz stats

      const result = await service.getInstructorCourseDetail('inst-1', 'c-10');

      expect(result.course.id).toBe('c-10');
      expect(result.course.title).toBe('Mastering NestJS');
      expect(result.enrollments.total).toBe(20);
      expect(result.enrollments.completed).toBe(5);
      expect(result.enrollments.completionRatePercent).toBe(25);
      expect(result.lessons.totalLessons).toBe(10);
      expect(result.quizzes.totalQuizzes).toBe(2);
      expect(result.quizzes.passRatePercent).toBe(75);
      expect(result.quizzes.averageScorePercent).toBe(82.5);
      expect(result.quizzes.scoreDistribution.excellent).toBe(4);
    });
  });
});
