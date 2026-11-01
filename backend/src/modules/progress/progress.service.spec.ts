import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { LessonProgress } from './entities/lesson-progress.entity';
import { LessonProgressStatus } from './enums/lesson-progress-status.enum';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { CourseSection } from '../curriculum/entities/course-section.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { Course } from '../courses/entities/course.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';

describe('ProgressService', () => {
  let service: ProgressService;

  const mockProgressRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLessonRepo = {
    findOne: jest.fn(),
  };

  const mockSectionRepo = {
    find: jest.fn(),
  };

  const mockEnrollmentRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
  };

  const mockCourseRepo = {
    findOne: jest.fn(),
  };

  const mockQuizRepo = {
    find: jest.fn(),
  };

  const mockQuizAttemptRepo = {
    find: jest.fn(),
  };

  const mockCourse: any = {
    id: 'course-1',
    instructorId: 'inst-1',
    title: 'Advanced Computer Systems',
  };

  const mockSection: any = {
    id: 'sec-1',
    courseId: 'course-1',
    title: 'Section 1',
    displayOrder: 0,
    course: mockCourse,
  };

  const mockLesson1: any = {
    id: 'lesson-1',
    sectionId: 'sec-1',
    title: 'Lecture 1: Intro',
    displayOrder: 0,
    section: mockSection,
  };

  const mockLesson2: any = {
    id: 'lesson-2',
    sectionId: 'sec-1',
    title: 'Lecture 2: Architecture',
    displayOrder: 1,
    section: mockSection,
  };

  const mockEnrollment: any = {
    id: 'enr-1',
    studentId: 'student-1',
    courseId: 'course-1',
    status: EnrollmentStatus.ACTIVE,
    enrolledAt: new Date('2026-01-01'),
    completedAt: null,
    course: mockCourse,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: getRepositoryToken(LessonProgress),
          useValue: mockProgressRepo,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonRepo,
        },
        {
          provide: getRepositoryToken(CourseSection),
          useValue: mockSectionRepo,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: mockEnrollmentRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepo,
        },
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepo,
        },
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockQuizAttemptRepo,
        },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  describe('startLessonProgress', () => {
    it('should start lesson progress for an enrolled student with active status', async () => {
      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockProgressRepo.findOne.mockResolvedValue(null);

      const createdEntity = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
        completedAt: null,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toSafeProgress: () => ({
          id: 'prog-1',
          status: LessonProgressStatus.IN_PROGRESS,
        }),
      };
      mockProgressRepo.create.mockReturnValue(createdEntity);
      mockProgressRepo.save.mockResolvedValue(createdEntity);

      const res = await service.startLessonProgress('student-1', 'lesson-1');
      expect(res.progress.status).toBe(LessonProgressStatus.IN_PROGRESS);
      expect(res.message).toContain('started');
    });

    it('should be idempotent and preserve startedAt on repeated start requests', async () => {
      const initialStartedAt = new Date('2026-02-01T10:00:00Z');
      const existingProgress = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.IN_PROGRESS,
        startedAt: initialStartedAt,
        lastAccessedAt: initialStartedAt,
        toSafeProgress: () => ({
          id: 'prog-1',
          status: LessonProgressStatus.IN_PROGRESS,
          startedAt: initialStartedAt,
        }),
      };

      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockProgressRepo.findOne.mockResolvedValue(existingProgress);
      mockProgressRepo.save.mockImplementation(async (p) => p);

      const res = await service.startLessonProgress('student-1', 'lesson-1');
      expect(existingProgress.startedAt).toEqual(initialStartedAt);
      expect(res.progress.status).toBe(LessonProgressStatus.IN_PROGRESS);
    });

    it('should throw ForbiddenException if student is not enrolled in the course', async () => {
      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.startLessonProgress('student-unauthorized', 'lesson-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if student has unpaid enrollment (PENDING_PAYMENT)', async () => {
      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue({
        ...mockEnrollment,
        status: EnrollmentStatus.PENDING_PAYMENT,
      });

      await expect(
        service.startLessonProgress('student-1', 'lesson-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockLessonRepo.findOne.mockResolvedValue(null);

      await expect(
        service.startLessonProgress('student-1', 'non-existent-lesson'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeLessonProgress', () => {
    it('should mark lesson complete and calculate course progress', async () => {
      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockProgressRepo.findOne.mockResolvedValue(null);

      const created = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        lastAccessedAt: new Date(),
        toSafeProgress: () => ({
          id: 'prog-1',
          status: LessonProgressStatus.COMPLETED,
        }),
      };
      mockProgressRepo.create.mockReturnValue(created);
      mockProgressRepo.save.mockResolvedValue(created);

      // Section with 2 lessons
      mockSectionRepo.find.mockResolvedValue([
        {
          ...mockSection,
          lessons: [mockLesson1, mockLesson2],
        },
      ]);
      mockProgressRepo.find.mockResolvedValue([created]);
      mockQuizRepo.find.mockResolvedValue([]);

      const res = await service.completeLessonProgress('student-1', 'lesson-1');
      expect(res.progress.status).toBe(LessonProgressStatus.COMPLETED);
      expect(res.courseProgress?.totalLessons).toBe(2);
      expect(res.courseProgress?.completedLessons).toBe(1);
      expect(res.courseProgress?.completionPercentage).toBe(50.0);
      expect(res.courseProgress?.isCompleted).toBe(false);
    });

    it('should be idempotent and preserve original completedAt on repeated completions', async () => {
      const originalCompletedAt = new Date('2026-02-01T12:00:00Z');
      const existing = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.COMPLETED,
        startedAt: new Date('2026-02-01T10:00:00Z'),
        completedAt: originalCompletedAt,
        lastAccessedAt: originalCompletedAt,
        toSafeProgress: () => ({
          id: 'prog-1',
          status: LessonProgressStatus.COMPLETED,
          completedAt: originalCompletedAt,
        }),
      };

      mockLessonRepo.findOne.mockResolvedValue(mockLesson1);
      mockEnrollmentRepo.findOne.mockResolvedValue(mockEnrollment);
      mockProgressRepo.findOne.mockResolvedValue(existing);
      mockProgressRepo.save.mockImplementation(async (p) => p);

      mockSectionRepo.find.mockResolvedValue([
        {
          ...mockSection,
          lessons: [mockLesson1],
        },
      ]);
      mockProgressRepo.find.mockResolvedValue([existing]);
      mockQuizRepo.find.mockResolvedValue([]);

      const res = await service.completeLessonProgress('student-1', 'lesson-1');
      expect(existing.completedAt).toEqual(originalCompletedAt);
      expect(res.progress.status).toBe(LessonProgressStatus.COMPLETED);
    });

    it('should auto-complete enrollment when all course lessons are completed', async () => {
      const p1 = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        toSafeProgress: () => ({ id: 'prog-1', status: LessonProgressStatus.COMPLETED }),
      };
      const p2 = {
        id: 'prog-2',
        studentId: 'student-1',
        lessonId: 'lesson-2',
        enrollmentId: 'enr-1',
        status: LessonProgressStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        toSafeProgress: () => ({ id: 'prog-2', status: LessonProgressStatus.COMPLETED }),
      };

      mockLessonRepo.findOne.mockResolvedValue(mockLesson2);
      const activeEnrollment = { ...mockEnrollment, status: EnrollmentStatus.ACTIVE };
      mockEnrollmentRepo.findOne.mockResolvedValue(activeEnrollment);
      mockProgressRepo.findOne.mockResolvedValue(p2);
      mockProgressRepo.save.mockImplementation(async (p) => p);

      mockSectionRepo.find.mockResolvedValue([
        {
          ...mockSection,
          lessons: [mockLesson1, mockLesson2],
        },
      ]);
      mockProgressRepo.find.mockResolvedValue([p1, p2]);
      mockQuizRepo.find.mockResolvedValue([]);
      mockEnrollmentRepo.save.mockImplementation(async (e) => e);

      const res = await service.completeLessonProgress('student-1', 'lesson-2');
      expect(res.courseProgress?.completionPercentage).toBe(100.0);
      expect(res.courseProgress?.isCompleted).toBe(true);
      expect(activeEnrollment.status).toBe(EnrollmentStatus.COMPLETED);
      expect(activeEnrollment.completedAt).toBeDefined();
    });
  });

  describe('calculateCourseProgress & safe empty curriculum', () => {
    it('should handle empty course curriculum safely with 0% progress and no division by zero', async () => {
      mockSectionRepo.find.mockResolvedValue([]); // No sections or lessons

      const summary = await service.calculateCourseProgress(
        mockEnrollment,
        mockCourse,
        'student-1',
      );

      expect(summary.totalLessons).toBe(0);
      expect(summary.completedLessons).toBe(0);
      expect(summary.remainingLessons).toBe(0);
      expect(summary.completionPercentage).toBe(0.0);
      expect(summary.isCompleted).toBe(false);
      expect(summary.lessons).toEqual([]);
    });

    it('should integrate quiz summaries without exposing answer keys', async () => {
      mockSectionRepo.find.mockResolvedValue([
        {
          ...mockSection,
          lessons: [mockLesson1],
        },
      ]);

      const mockProgress = {
        id: 'prog-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        status: LessonProgressStatus.COMPLETED,
        lastAccessedAt: new Date(),
      };
      mockProgressRepo.find.mockResolvedValue([mockProgress]);

      const mockQuiz = {
        id: 'quiz-1',
        lessonId: 'lesson-1',
        title: 'Quiz 1',
        isPublished: true,
        passingScore: 75.0,
        attempts: [
          {
            id: 'att-1',
            studentId: 'student-1',
            status: QuizAttemptStatus.SUBMITTED,
            isPassed: true,
            score: 85.0,
            maxScore: 100.0,
          },
        ],
      };
      mockQuizRepo.find.mockResolvedValue([mockQuiz]);

      const summary = await service.calculateCourseProgress(
        mockEnrollment,
        mockCourse,
        'student-1',
      );

      expect(summary.totalLessons).toBe(1);
      expect(summary.completedLessons).toBe(1);
      expect(summary.completionPercentage).toBe(100.0);

      const lessonDetail = summary.lessons?.[0];
      expect(lessonDetail?.quizzes).toHaveLength(1);
      expect(lessonDetail?.quizzes?.[0].title).toBe('Quiz 1');
      expect(lessonDetail?.quizzes?.[0].isPassed).toBe(true);
      expect(lessonDetail?.quizzes?.[0].highestScore).toBe(85.0);
      // Ensure no answer keys or internal keys are present
      const firstQuiz = lessonDetail?.quizzes?.[0] as any;
      expect(firstQuiz?.options).toBeUndefined();
      expect(firstQuiz?.correctAnswer).toBeUndefined();
    });
  });

  describe('getCourseProgressByEnrollment privacy', () => {
    it('should reject when a student tries to view another student’s progress', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue({
        id: 'enr-foreign',
        studentId: 'other-student',
        courseId: 'course-1',
        status: EnrollmentStatus.ACTIVE,
        course: mockCourse,
      });

      await expect(
        service.getCourseProgressByEnrollment('student-1', 'enr-foreign'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getCourseProgressByEnrollment('student-1', 'enr-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseProgressForInstructor', () => {
    it('should allow course owner instructor to view student progress summaries', async () => {
      mockCourseRepo.findOne.mockResolvedValue(mockCourse); // instructorId is 'inst-1'

      const enrolledStudent = {
        id: 'enr-1',
        studentId: 'stud-1',
        status: EnrollmentStatus.ACTIVE,
        createdAt: new Date(),
        student: {
          id: 'stud-1',
          email: 'student@example.com',
          fullName: 'Jane Student',
        },
      };

      mockEnrollmentRepo.findAndCount.mockResolvedValue([[enrolledStudent], 1]);
      mockSectionRepo.find.mockResolvedValue([
        {
          ...mockSection,
          lessons: [mockLesson1],
        },
      ]);
      mockProgressRepo.find.mockResolvedValue([]);
      mockQuizRepo.find.mockResolvedValue([]);

      const result = await service.getCourseProgressForInstructor('inst-1', 'course-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].student.email).toBe('student@example.com');
      expect(result.data[0].student.fullName).toBe('Jane Student');
      expect(result.meta.total).toBe(1);
    });

    it('should reject instructor viewing progress for a course they do not own', async () => {
      mockCourseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        instructorId: 'another-instructor',
      });

      await expect(
        service.getCourseProgressForInstructor('inst-1', 'course-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
