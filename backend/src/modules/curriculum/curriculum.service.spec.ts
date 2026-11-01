/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CourseSection } from './entities/course-section.entity';
import { Lesson } from './entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { LessonContentType } from './enums/lesson-content-type.enum';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UserRole } from '../users/enums/user-role.enum';

describe('CurriculumService', () => {
  let service: CurriculumService;
  let sectionRepository: any;
  let lessonRepository: any;
  let courseRepository: any;
  let coursesService: any;
  let enrollmentsService: any;

  const mockCourse: Partial<Course> = {
    id: 'course-1',
    title: 'Distributed Systems 101',
    instructorId: 'inst-1',
    status: CourseStatus.PUBLISHED,
  };

  const mockSection: Partial<CourseSection> = {
    id: 'section-1',
    courseId: 'course-1',
    title: 'Module 1: Foundations',
    description: 'Foundations overview',
    displayOrder: 0,
    course: mockCourse as Course,
    lessons: [],
    toSafeSection: function (hasAccess = false) {
      return {
        id: this.id,
        courseId: this.courseId,
        title: this.title,
        description: this.description,
        displayOrder: this.displayOrder,
        sequenceOrder: this.displayOrder,
        lessons: (this.lessons || []).map((l: any) => l.toSafeLesson(hasAccess)),
      } as any;
    },
  };

  const mockLesson: Partial<Lesson> = {
    id: 'lesson-1',
    sectionId: 'section-1',
    title: 'Lesson 1.1: Consistency Models',
    contentType: LessonContentType.VIDEO,
    textContent: 'Explanation of strict consistency',
    videoUrl: 'https://cdn.example.com/video1.mp4',
    contentUrl: null,
    estimatedDuration: 15,
    displayOrder: 0,
    isPreview: false,
    section: mockSection as CourseSection,
    toSafeLesson: function (hasAccess = false) {
      const isUnlocked = hasAccess || this.isPreview;
      return {
        id: this.id,
        sectionId: this.sectionId,
        title: this.title,
        contentType: this.contentType,
        estimatedDuration: this.estimatedDuration,
        durationMinutes: this.estimatedDuration,
        displayOrder: this.displayOrder,
        sequenceOrder: this.displayOrder,
        isPreview: this.isPreview,
        isUnlocked,
        textContent: isUnlocked ? this.textContent : undefined,
        videoUrl: isUnlocked ? this.videoUrl : undefined,
        contentUrl: isUnlocked ? this.contentUrl : undefined,
      } as any;
    },
  };

  const mockPreviewLesson: Partial<Lesson> = {
    ...mockLesson,
    id: 'lesson-preview',
    title: 'Free Preview Intro',
    isPreview: true,
  };

  beforeEach(async () => {
    sectionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({
        ...dto,
        id: 'new-section-id',
        toSafeSection: mockSection.toSafeSection,
      })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      remove: jest.fn().mockResolvedValue({}),
    };

    lessonRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({
        ...dto,
        id: 'new-lesson-id',
        toSafeLesson: mockLesson.toSafeLesson,
      })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      remove: jest.fn().mockResolvedValue({}),
    };

    courseRepository = {
      findOne: jest.fn(),
    };

    coursesService = {
      findInstructorCourseById: jest.fn(),
    };

    enrollmentsService = {
      hasAccessToCourse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumService,
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepository },
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        { provide: getRepositoryToken(Course), useValue: courseRepository },
        { provide: CoursesService, useValue: coursesService },
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();

    service = module.get<CurriculumService>(CurriculumService);
  });

  describe('Section Management (Instructor)', () => {
    it('should create section for course owned by instructor', async () => {
      coursesService.findInstructorCourseById.mockResolvedValue(mockCourse);
      sectionRepository.findOne.mockResolvedValue(null);

      const result = await service.createSection('inst-1', 'course-1', {
        title: 'New Module',
        displayOrder: 0,
      });

      expect(coursesService.findInstructorCourseById).toHaveBeenCalledWith('inst-1', 'course-1');
      expect(result.title).toBe('New Module');
    });

    it('should reject section creation if instructor does not own course', async () => {
      coursesService.findInstructorCourseById.mockRejectedValue(
        new ForbiddenException('Access denied: You do not own this course'),
      );

      await expect(
        service.createSection('other-inst', 'course-1', { title: 'Unauthorized' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update section when instructor is course owner', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection);

      const result = await service.updateSection('inst-1', 'section-1', {
        title: 'Updated Module Title',
      });

      expect(result.title).toBe('Updated Module Title');
      expect(sectionRepository.save).toHaveBeenCalled();
    });

    it('should reject section update when instructor is not the owner', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection);

      await expect(
        service.updateSection('other-inst', 'section-1', { title: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete section when instructor is the owner', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection);

      const result = await service.deleteSection('inst-1', 'section-1');
      expect(result.message).toContain('successfully deleted');
      expect(sectionRepository.remove).toHaveBeenCalledWith(mockSection);
    });
  });

  describe('Lesson Management (Instructor)', () => {
    it('should create lesson in section for course owned by instructor', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection);
      lessonRepository.findOne.mockResolvedValue(null);

      const result = await service.createLesson('inst-1', 'section-1', {
        title: 'New Video Lesson',
        contentType: LessonContentType.VIDEO,
        videoUrl: 'https://cdn.example.com/video.mp4',
        estimatedDuration: 20,
      });

      expect(result.title).toBe('New Video Lesson');
      expect(lessonRepository.save).toHaveBeenCalled();
    });

    it('should reject lesson creation if instructor does not own section course', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection);

      await expect(
        service.createLesson('other-inst', 'section-1', {
          title: 'Hacked Lesson',
          contentType: LessonContentType.TEXT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete lesson when instructor is the owner', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);

      const result = await service.deleteLesson('inst-1', 'lesson-1');
      expect(result.message).toContain('successfully deleted');
      expect(lessonRepository.remove).toHaveBeenCalledWith(mockLesson);
    });
  });

  describe('Student / Public Curriculum Access', () => {
    it('should return curriculum outline with locked content for unenrolled visitors', async () => {
      courseRepository.findOne.mockResolvedValue(mockCourse);
      const sectionWithLessons = {
        ...mockSection,
        lessons: [mockLesson, mockPreviewLesson],
      };
      sectionRepository.find.mockResolvedValue([sectionWithLessons]);

      const result = await service.getCourseCurriculum('course-1', undefined);

      expect(result.hasAccess).toBe(false);
      expect(result.sections).toHaveLength(1);
      const lessons = result.sections[0].lessons;
      expect(lessons[0].isUnlocked).toBe(false);
      expect(lessons[0].videoUrl).toBeUndefined(); // Protected lesson locked
      expect(lessons[1].isUnlocked).toBe(true);
      expect(lessons[1].videoUrl).toBeDefined(); // Preview lesson unlocked
    });

    it('should return fully unlocked lessons for enrolled student with verified access', async () => {
      courseRepository.findOne.mockResolvedValue(mockCourse);
      enrollmentsService.hasAccessToCourse.mockResolvedValue(true);
      const sectionWithLessons = {
        ...mockSection,
        lessons: [mockLesson],
      };
      sectionRepository.find.mockResolvedValue([sectionWithLessons]);

      const result = await service.getCourseCurriculum('course-1', {
        id: 'student-1',
        role: UserRole.STUDENT,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.sections[0].lessons[0].isUnlocked).toBe(true);
      expect(result.sections[0].lessons[0].videoUrl).toBe('https://cdn.example.com/video1.mp4');
    });

    it('should reject non-preview lesson access if user is unauthenticated', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);

      await expect(service.getLessonById('lesson-1', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow access to preview lesson even for unauthenticated users', async () => {
      lessonRepository.findOne.mockResolvedValue(mockPreviewLesson);

      const result = await service.getLessonById('lesson-preview', undefined);
      expect(result.isUnlocked).toBe(true);
      expect(result.title).toBe('Free Preview Intro');
    });

    it('should grant lesson access to student with verified active enrollment', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);
      enrollmentsService.hasAccessToCourse.mockResolvedValue(true);

      const result = await service.getLessonById('lesson-1', {
        id: 'student-1',
        role: UserRole.STUDENT,
      });

      expect(result.isUnlocked).toBe(true);
      expect(result.videoUrl).toBe('https://cdn.example.com/video1.mp4');
    });

    it('should deny lesson access to student without active enrollment or payment', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);
      enrollmentsService.hasAccessToCourse.mockResolvedValue(false);

      await expect(
        service.getLessonById('lesson-1', {
          id: 'student-unenrolled',
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny lesson access to instructor who does not own the course', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);

      await expect(
        service.getLessonById('lesson-1', {
          id: 'other-instructor',
          role: UserRole.INSTRUCTOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any lesson', async () => {
      lessonRepository.findOne.mockResolvedValue(mockLesson);

      const result = await service.getLessonById('lesson-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      expect(result.isUnlocked).toBe(true);
    });
  });
});
