/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import { CourseStatus } from './enums/course-status.enum';
import { DifficultyLevel } from './enums/difficulty-level.enum';
import { CategoriesService } from '../categories/categories.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepo: any;
  let categoriesService: any;

  const instructorId = 'instructor-uuid-1';
  const otherInstructorId = 'instructor-uuid-2';

  const mockCourse: Course = {
    id: 'course-uuid-1',
    title: 'Full Stack Development with NestJS',
    slug: 'full-stack-development-with-nestjs',
    shortDescription: 'Short intro',
    description: 'Comprehensive guide to building full stack apps with NestJS and React.',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    instructorId,
    instructor: { id: instructorId, fullName: 'John Doe', email: 'john@example.com' } as any,
    categoryId: 'cat-uuid-1',
    category: { id: 'cat-uuid-1', name: 'Web Dev', slug: 'web-dev' } as any,
    difficultyLevel: DifficultyLevel.BEGINNER,
    estimatedDuration: 40,
    price: 49.99,
    currency: 'USD',
    prerequisites: ['Basic JavaScript'],
    learningOutcomes: ['Build APIs', 'Deploy containers'],
    sections: [],
    skills: [],
    status: CourseStatus.DRAFT,
    rejectionReason: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    toPublicCourse() {
      return {
        id: this.id,
        title: this.title,
        slug: this.slug,
        status: this.status,
      } as any;
    },
  };

  beforeEach(async () => {
    courseRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    categoriesService = {
      findById: jest.fn().mockResolvedValue({ id: 'cat-uuid-1', name: 'Web Dev' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepo,
        },
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: EmailService,
          useValue: { sendMail: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('createDraft', () => {
    it('should create a draft course with generated slug and DRAFT status', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // slug is available
      };
      courseRepo.createQueryBuilder.mockReturnValue(mockQb);
      courseRepo.create.mockImplementation((data: any) => ({ ...mockCourse, ...data }));
      courseRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.createDraft(instructorId, {
        title: 'Full Stack Development with NestJS',
        description: 'Comprehensive guide to building full stack apps with NestJS and React.',
        categoryId: 'cat-uuid-1',
      });

      expect(categoriesService.findById).toHaveBeenCalledWith('cat-uuid-1');
      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(result.instructorId).toBe(instructorId);
      expect(result.slug).toBe('full-stack-development-with-nestjs');
    });
  });

  describe('findInstructorCourseById & ownership enforcement', () => {
    it('should return course if requesting instructor is the owner', async () => {
      courseRepo.findOne.mockResolvedValue(mockCourse);

      const result = await service.findInstructorCourseById(instructorId, mockCourse.id);
      expect(result).toBe(mockCourse);
    });

    it('should deny access with ForbiddenException if requesting instructor is NOT the owner', async () => {
      courseRepo.findOne.mockResolvedValue(mockCourse);

      await expect(
        service.findInstructorCourseById(otherInstructorId, mockCourse.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if course does not exist', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findInstructorCourseById(instructorId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInstructorCourse & lifecycle transitions', () => {
    it('should update course fields when status is DRAFT', async () => {
      courseRepo.findOne.mockResolvedValue({ ...mockCourse });
      courseRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.updateInstructorCourse(instructorId, mockCourse.id, {
        shortDescription: 'Updated short description',
      });

      expect(result.shortDescription).toBe('Updated short description');
    });

    it('should reject update if course is PENDING_REVIEW', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PENDING_REVIEW,
      });

      await expect(
        service.updateInstructorCourse(instructorId, mockCourse.id, {
          title: 'New Title While In Review',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset PUBLISHED course back to PENDING_REVIEW on material edit', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      courseRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.updateInstructorCourse(instructorId, mockCourse.id, {
        description: 'Substantially updated description of the course.',
      });

      expect(result.status).toBe(CourseStatus.PENDING_REVIEW);
      expect(result.publishedAt).toBeNull();
    });
  });

  describe('deleteInstructorCourse', () => {
    it('should delete a DRAFT or REJECTED course', async () => {
      courseRepo.findOne.mockResolvedValue({ ...mockCourse, status: CourseStatus.DRAFT });
      courseRepo.remove.mockResolvedValue(mockCourse);

      const result = await service.deleteInstructorCourse(instructorId, mockCourse.id);
      expect(result.message).toContain('deleted');
      expect(courseRepo.remove).toHaveBeenCalled();
    });

    it('should reject deletion of PUBLISHED or PENDING_REVIEW courses', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      await expect(
        service.deleteInstructorCourse(instructorId, mockCourse.id),
      ).rejects.toThrow(BadRequestException);
      expect(courseRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('submitForReview', () => {
    it('should submit complete DRAFT course and transition to PENDING_REVIEW', async () => {
      courseRepo.findOne.mockResolvedValue({ ...mockCourse, status: CourseStatus.DRAFT });
      courseRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.submitForReview(instructorId, mockCourse.id);
      expect(result.status).toBe(CourseStatus.PENDING_REVIEW);
      expect(result.rejectionReason).toBeNull();
    });

    it('should reject submission if course lacks learning outcomes', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        learningOutcomes: [],
      });

      await expect(
        service.submitForReview(instructorId, mockCourse.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if course is already PUBLISHED', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      await expect(
        service.submitForReview(instructorId, mockCourse.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('admin moderation (approve & reject)', () => {
    it('should approve a PENDING_REVIEW course and transition to PUBLISHED', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PENDING_REVIEW,
      });
      courseRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.approveCourse(mockCourse.id);
      expect(result.status).toBe(CourseStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
    });

    it('should reject approval if course is not PENDING_REVIEW', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });

      await expect(service.approveCourse(mockCourse.id)).rejects.toThrow(BadRequestException);
    });

    it('should reject course with feedback and transition to REJECTED', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PENDING_REVIEW,
      });
      courseRepo.save.mockImplementation(async (c: any) => c);

      const feedback = 'Please add more detailed prerequisites and video samples.';
      const result = await service.rejectCourse(mockCourse.id, feedback);

      expect(result.status).toBe(CourseStatus.REJECTED);
      expect(result.rejectionReason).toBe(feedback);
      expect(result.publishedAt).toBeNull();
    });

    it('should throw BadRequestException when attempting to reject a course not in PENDING_REVIEW', async () => {
      courseRepo.findOne.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });

      await expect(
        service.rejectCourse(mockCourse.id, 'Feedback reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
