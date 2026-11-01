import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationsService } from './recommendations.service';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { DifficultyLevel } from '../courses/enums/difficulty-level.enum';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let courseRepository: any;
  let enrollmentRepository: any;
  let quizAttemptRepository: any;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const createMockCourse = (overrides: Partial<Course> = {}): Course => {
    const course = new Course();
    course.id = overrides.id || 'course-uuid-1';
    course.title = overrides.title || 'Introduction to TypeScript';
    course.slug = overrides.slug || 'intro-to-typescript';
    course.description = overrides.description || 'A comprehensive introduction to TypeScript.';
    course.price = overrides.price !== undefined ? overrides.price : 0;
    course.currency = 'USD';
    course.categoryId = overrides.categoryId || 'cat-web-dev';
    course.category = overrides.category || ({
      id: course.categoryId,
      name: 'Web Development',
      slug: 'web-dev',
    } as any);
    course.difficultyLevel = overrides.difficultyLevel || DifficultyLevel.BEGINNER;
    course.status = overrides.status || CourseStatus.PUBLISHED;
    course.prerequisites = overrides.prerequisites || [];
    course.learningOutcomes = ['Learn types'];
    course.estimatedDuration = 10;
    course.publishedAt = overrides.publishedAt || new Date('2026-01-01T00:00:00Z');
    course.createdAt = overrides.createdAt || new Date('2026-01-01T00:00:00Z');
    course.updatedAt = new Date('2026-01-01T00:00:00Z');
    return course;
  };

  beforeEach(async () => {
    courseRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn(),
    };
    enrollmentRepository = {
      find: jest.fn(),
    };
    quizAttemptRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: enrollmentRepository,
        },
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: quizAttemptRepository,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('New student fallback', () => {
    it('should return fallback recommendations when student has no enrollment history', async () => {
      const studentId = 'new-student-uuid';
      enrollmentRepository.find.mockResolvedValue([]);
      quizAttemptRepository.find.mockResolvedValue([]);

      const course1 = createMockCourse({
        id: 'c1',
        title: 'Beginner JS',
        difficultyLevel: DifficultyLevel.BEGINNER,
      });
      const course2 = createMockCourse({
        id: 'c2',
        title: 'Intermediate Python',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
      });

      mockQueryBuilder.getMany.mockResolvedValue([course1, course2]);
      courseRepository.find.mockResolvedValue([course1, course2]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      expect(result.meta.isFallback).toBe(true);
      expect(result.data.length).toBe(2);
      // Beginner course should receive boost in fallback
      expect(result.data[0].course.id).toBe('c1');
      expect(result.data[0].score).toBe(20);
      expect(result.data[0].reason).toContain('introductory');
      expect(result.data[1].score).toBe(10);
    });
  });

  describe('Eligibility & Exclusion rules', () => {
    it('should exclude courses student is actively enrolled in', async () => {
      const studentId = 'student-1';
      const activeEnrollment = {
        studentId,
        courseId: 'c-enrolled',
        status: EnrollmentStatus.ACTIVE,
        course: createMockCourse({ id: 'c-enrolled', title: 'Enrolled Course' }),
      };
      enrollmentRepository.find.mockResolvedValue([activeEnrollment]);
      quizAttemptRepository.find.mockResolvedValue([]);

      const candidateCourse = createMockCourse({ id: 'c-candidate', title: 'Available Course' });
      mockQueryBuilder.getMany.mockResolvedValue([candidateCourse]);
      courseRepository.find.mockResolvedValue([activeEnrollment.course, candidateCourse]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      // Verify that the query builder filtered out c-enrolled
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.id NOT IN (:...enrolledIds)',
        expect.objectContaining({ enrolledIds: ['c-enrolled'] }),
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0].course.id).toBe('c-candidate');
    });

    it('should exclude courses where prerequisites are unmet', async () => {
      const studentId = 'student-1';
      const prereqCourse = createMockCourse({ id: 'c-prereq', title: 'Calculus I', slug: 'calc-1' });
      const advancedCourse = createMockCourse({
        id: 'c-adv',
        title: 'Calculus II',
        prerequisites: ['Calculus I'],
      });

      // Student has enrolled in something else, not Calculus I
      const unrelatedEnrollment = {
        studentId,
        courseId: 'c-unrelated',
        status: EnrollmentStatus.ACTIVE,
        course: createMockCourse({ id: 'c-unrelated', categoryId: 'cat-arts' }),
      };
      enrollmentRepository.find.mockResolvedValue([unrelatedEnrollment]);
      quizAttemptRepository.find.mockResolvedValue([]);

      // Query builder returns advancedCourse
      mockQueryBuilder.getMany.mockResolvedValue([advancedCourse]);
      // All courses in database contains prereqCourse and advancedCourse
      courseRepository.find.mockResolvedValue([prereqCourse, advancedCourse]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      // Advanced course excluded because Calculus I is unmet
      expect(result.data.length).toBe(0);
    });

    it('should include course when its prerequisite course is completed', async () => {
      const studentId = 'student-1';
      const prereqCourse = createMockCourse({
        id: 'c-prereq',
        title: 'Python Basics',
        slug: 'python-basics',
        categoryId: 'cat-python',
      });
      const followUpCourse = createMockCourse({
        id: 'c-followup',
        title: 'Data Analysis with Python',
        categoryId: 'cat-python',
        prerequisites: ['Python Basics'],
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
      });

      const completedEnrollment = {
        studentId,
        courseId: 'c-prereq',
        status: EnrollmentStatus.COMPLETED,
        course: prereqCourse,
      };
      enrollmentRepository.find.mockResolvedValue([completedEnrollment]);
      quizAttemptRepository.find.mockResolvedValue([]);

      mockQueryBuilder.getMany.mockResolvedValue([followUpCourse]);
      courseRepository.find.mockResolvedValue([prereqCourse, followUpCourse]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      expect(result.data.length).toBe(1);
      expect(result.data[0].course.id).toBe('c-followup');
      expect(result.data[0].signals).toContain(
        'Direct progression following your completed coursework',
      );
    });
  });

  describe('Ranking and Scoring Signals', () => {
    it('should rank courses in matching categories higher than unexplored categories', async () => {
      const studentId = 'student-1';
      const webDevCourse = createMockCourse({
        id: 'c-web-1',
        categoryId: 'cat-web',
        title: 'HTML & CSS',
      });

      const enrollment = {
        studentId,
        courseId: 'c-web-1',
        status: EnrollmentStatus.ACTIVE,
        course: webDevCourse,
      };
      enrollmentRepository.find.mockResolvedValue([enrollment]);
      quizAttemptRepository.find.mockResolvedValue([]);

      const candidateWeb = createMockCourse({
        id: 'c-web-2',
        categoryId: 'cat-web',
        title: 'Advanced React',
        category: { id: 'cat-web', name: 'Web Dev' } as any,
      });
      const candidateData = createMockCourse({
        id: 'c-data-1',
        categoryId: 'cat-data',
        title: 'Intro to SQL',
        category: { id: 'cat-data', name: 'Data Science' } as any,
      });

      mockQueryBuilder.getMany.mockResolvedValue([candidateData, candidateWeb]);
      courseRepository.find.mockResolvedValue([webDevCourse, candidateWeb, candidateData]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      expect(result.data.length).toBe(2);
      expect(result.data[0].course.id).toBe('c-web-2');
      expect(result.data[0].score).toBeGreaterThan(result.data[1].score);
      expect(result.data[0].signals).toContain(
        'Matches your active learning interest in Web Dev',
      );
    });

    it('should boost courses when student demonstrated quiz proficiency in the category', async () => {
      const studentId = 'student-1';
      const existingCourse = createMockCourse({
        id: 'c-existing',
        categoryId: 'cat-cloud',
        title: 'Cloud Foundations',
      });

      enrollmentRepository.find.mockResolvedValue([
        {
          studentId,
          courseId: 'c-existing',
          status: EnrollmentStatus.ACTIVE,
          course: existingCourse,
        },
      ]);

      // Passed quiz attempt in Cloud category
      quizAttemptRepository.find.mockResolvedValue([
        {
          studentId,
          isPassed: true,
          quiz: {
            lesson: {
              section: {
                course: {
                  categoryId: 'cat-cloud',
                },
              },
            },
          },
        },
      ]);

      const candidateCourse = createMockCourse({
        id: 'c-cloud-2',
        categoryId: 'cat-cloud',
        title: 'Kubernetes in Production',
      });

      mockQueryBuilder.getMany.mockResolvedValue([candidateCourse]);
      courseRepository.find.mockResolvedValue([existingCourse, candidateCourse]);

      const result = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      expect(result.data[0].signals).toContain(
        'Builds on topics where you demonstrated quiz proficiency',
      );
    });
  });

  describe('Deterministic Ordering and Tie-Breaking', () => {
    it('should sort deterministically by score DESC, publishedAt DESC, title ASC, and id ASC', async () => {
      const studentId = 'student-1';
      enrollmentRepository.find.mockResolvedValue([]);
      quizAttemptRepository.find.mockResolvedValue([]);

      const dateA = new Date('2026-03-01T00:00:00Z');
      const dateB = new Date('2026-01-01T00:00:00Z');

      const c1 = createMockCourse({
        id: 'c1',
        title: 'Alpha Course',
        publishedAt: dateB,
        difficultyLevel: DifficultyLevel.ADVANCED,
      });
      const c2 = createMockCourse({
        id: 'c2',
        title: 'Beta Course',
        publishedAt: dateA, // Newer -> should rank above c1 when scores are equal
        difficultyLevel: DifficultyLevel.ADVANCED,
      });

      mockQueryBuilder.getMany.mockResolvedValue([c1, c2]);
      courseRepository.find.mockResolvedValue([c1, c2]);

      const res1 = await service.getRecommendationsForStudent(studentId, { limit: 6 });
      const res2 = await service.getRecommendationsForStudent(studentId, { limit: 6 });

      // Both runs must be identical
      expect(res1.data.map((d) => d.course.id)).toEqual(['c2', 'c1']);
      expect(res2.data.map((d) => d.course.id)).toEqual(['c2', 'c1']);
    });
  });
});
