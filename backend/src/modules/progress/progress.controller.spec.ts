/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { LessonsProgressController } from './controllers/lessons-progress.controller';
import { EnrollmentsProgressController } from './controllers/enrollments-progress.controller';
import { InstructorProgressController } from './controllers/instructor-progress.controller';
import { ProgressService } from './progress.service';
import { LessonProgressStatus } from './enums/lesson-progress-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('ProgressControllers', () => {
  let lessonsController: LessonsProgressController;
  let enrollmentsController: EnrollmentsProgressController;
  let instructorController: InstructorProgressController;
  let progressService: ProgressService;

  const mockProgressService = {
    startLessonProgress: jest.fn(),
    completeLessonProgress: jest.fn(),
    getLessonProgress: jest.fn(),
    getCourseProgressByEnrollment: jest.fn(),
    getCourseProgressByCourseId: jest.fn(),
    getCourseProgressForInstructor: jest.fn(),
  };

  const studentUser: User = {
    id: 'student-uuid',
    email: 'student@example.com',
    fullName: 'Student User',
    role: UserRole.STUDENT,
  } as User;

  const instructorUser: User = {
    id: 'instructor-uuid',
    email: 'instructor@example.com',
    fullName: 'Instructor User',
    role: UserRole.INSTRUCTOR,
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        LessonsProgressController,
        EnrollmentsProgressController,
        InstructorProgressController,
      ],
      providers: [
        {
          provide: ProgressService,
          useValue: mockProgressService,
        },
      ],
    }).compile();

    lessonsController = module.get<LessonsProgressController>(LessonsProgressController);
    enrollmentsController = module.get<EnrollmentsProgressController>(EnrollmentsProgressController);
    instructorController = module.get<InstructorProgressController>(InstructorProgressController);
    progressService = module.get<ProgressService>(ProgressService);
  });

  describe('LessonsProgressController', () => {
    it('startProgress should delegate to progressService.startLessonProgress with user.id', async () => {
      mockProgressService.startLessonProgress.mockResolvedValue({
        progress: { id: 'p-1', status: LessonProgressStatus.IN_PROGRESS },
        message: 'Started',
      });

      const res = await lessonsController.startProgress(studentUser, 'lesson-1');
      expect(progressService.startLessonProgress).toHaveBeenCalledWith(
        'student-uuid',
        'lesson-1',
      );
      expect(res.progress.status).toBe(LessonProgressStatus.IN_PROGRESS);
    });

    it('completeProgress should delegate to progressService.completeLessonProgress with user.id', async () => {
      mockProgressService.completeLessonProgress.mockResolvedValue({
        progress: { id: 'p-1', status: LessonProgressStatus.COMPLETED },
        message: 'Completed',
      });

      const res = await lessonsController.completeProgress(studentUser, 'lesson-1');
      expect(progressService.completeLessonProgress).toHaveBeenCalledWith(
        'student-uuid',
        'lesson-1',
      );
      expect(res.progress.status).toBe(LessonProgressStatus.COMPLETED);
    });

    it('getLessonProgress should delegate to progressService.getLessonProgress with user.id', async () => {
      mockProgressService.getLessonProgress.mockResolvedValue({
        id: 'p-1',
        status: LessonProgressStatus.NOT_STARTED,
      });

      const res = await lessonsController.getLessonProgress(studentUser, 'lesson-1');
      expect(progressService.getLessonProgress).toHaveBeenCalledWith(
        'student-uuid',
        'lesson-1',
      );
      expect(res.status).toBe(LessonProgressStatus.NOT_STARTED);
    });
  });

  describe('EnrollmentsProgressController', () => {
    it('getEnrollmentProgress should delegate to progressService.getCourseProgressByEnrollment with user.id', async () => {
      mockProgressService.getCourseProgressByEnrollment.mockResolvedValue({
        courseId: 'c-1',
        completionPercentage: 50.0,
      });

      const res = await enrollmentsController.getEnrollmentProgress(
        studentUser,
        'enr-1',
      );
      expect(progressService.getCourseProgressByEnrollment).toHaveBeenCalledWith(
        'student-uuid',
        'enr-1',
      );
      expect(res.completionPercentage).toBe(50.0);
    });

    it('getCourseProgress should delegate to progressService.getCourseProgressByCourseId with user.id', async () => {
      mockProgressService.getCourseProgressByCourseId.mockResolvedValue({
        courseId: 'c-1',
        completionPercentage: 100.0,
      });

      const res = await enrollmentsController.getCourseProgress(
        studentUser,
        'c-1',
      );
      expect(progressService.getCourseProgressByCourseId).toHaveBeenCalledWith(
        'student-uuid',
        'c-1',
      );
      expect(res.completionPercentage).toBe(100.0);
    });
  });

  describe('InstructorProgressController', () => {
    it('getCourseProgress should delegate to progressService.getCourseProgressForInstructor with instructor id', async () => {
      mockProgressService.getCourseProgressForInstructor.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const query = { page: 1, limit: 10 };
      const res = await instructorController.getCourseProgress(
        instructorUser,
        'c-1',
        query,
      );
      expect(progressService.getCourseProgressForInstructor).toHaveBeenCalledWith(
        'instructor-uuid',
        'c-1',
        query,
      );
      expect(res.meta.total).toBe(0);
    });
  });
});
