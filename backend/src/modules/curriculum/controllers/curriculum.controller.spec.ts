/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { InstructorCurriculumController } from './instructor-curriculum.controller';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from '../curriculum.service';
import { LessonContentType } from '../enums/lesson-content-type.enum';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

describe('Curriculum Controllers', () => {
  let instructorController: InstructorCurriculumController;
  let publicController: CurriculumController;
  let service: any;

  const mockInstructor: Partial<User> = {
    id: 'inst-1',
    role: UserRole.INSTRUCTOR,
  };

  const mockStudent: Partial<User> = {
    id: 'student-1',
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    service = {
      createSection: jest.fn().mockResolvedValue({ id: 's-1', title: 'Module 1' }),
      findCourseSectionsForInstructor: jest.fn().mockResolvedValue([{ id: 's-1' }]),
      updateSection: jest.fn().mockResolvedValue({ id: 's-1', title: 'Updated' }),
      deleteSection: jest.fn().mockResolvedValue({ message: 'Deleted' }),
      createLesson: jest.fn().mockResolvedValue({ id: 'l-1', title: 'Lesson 1' }),
      findSectionLessonsForInstructor: jest.fn().mockResolvedValue([{ id: 'l-1' }]),
      updateLesson: jest.fn().mockResolvedValue({ id: 'l-1', title: 'Updated' }),
      deleteLesson: jest.fn().mockResolvedValue({ message: 'Deleted' }),
      getCourseCurriculum: jest.fn().mockResolvedValue({
        courseId: 'c-1',
        hasAccess: true,
        sections: [],
      }),
      getLessonById: jest.fn().mockResolvedValue({
        id: 'l-1',
        title: 'Lesson 1',
        isUnlocked: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstructorCurriculumController, CurriculumController],
      providers: [{ provide: CurriculumService, useValue: service }],
    }).compile();

    instructorController = module.get<InstructorCurriculumController>(
      InstructorCurriculumController,
    );
    publicController = module.get<CurriculumController>(CurriculumController);
  });

  describe('InstructorCurriculumController', () => {
    it('should delegate createSection to curriculumService', async () => {
      const res = await instructorController.createSection(
        mockInstructor as User,
        'c-1',
        { title: 'Module 1' },
      );
      expect(service.createSection).toHaveBeenCalledWith('inst-1', 'c-1', {
        title: 'Module 1',
      });
      expect(res.id).toBe('s-1');
    });

    it('should delegate createLesson to curriculumService', async () => {
      const res = await instructorController.createLesson(
        mockInstructor as User,
        's-1',
        { title: 'Lesson 1', contentType: LessonContentType.VIDEO },
      );
      expect(service.createLesson).toHaveBeenCalledWith('inst-1', 's-1', {
        title: 'Lesson 1',
        contentType: LessonContentType.VIDEO,
      });
      expect(res.id).toBe('l-1');
    });

    it('should delegate updateLesson and deleteLesson to curriculumService', async () => {
      await instructorController.updateLesson(mockInstructor as User, 'l-1', {
        title: 'Updated',
      });
      expect(service.updateLesson).toHaveBeenCalledWith('inst-1', 'l-1', {
        title: 'Updated',
      });

      await instructorController.deleteLesson(mockInstructor as User, 'l-1');
      expect(service.deleteLesson).toHaveBeenCalledWith('inst-1', 'l-1');
    });
  });

  describe('CurriculumController (Student / Public)', () => {
    it('should delegate getCourseCurriculum with user if present', async () => {
      const res = await publicController.getCourseCurriculum('c-1', mockStudent as User);
      expect(service.getCourseCurriculum).toHaveBeenCalledWith('c-1', {
        id: 'student-1',
        role: UserRole.STUDENT,
      });
      expect(res.courseId).toBe('c-1');
    });

    it('should delegate getLessonById with user if present', async () => {
      const res = await publicController.getLessonById('l-1', mockStudent as User);
      expect(service.getLessonById).toHaveBeenCalledWith('l-1', {
        id: 'student-1',
        role: UserRole.STUDENT,
      });
      expect(res.id).toBe('l-1');
    });
  });
});
