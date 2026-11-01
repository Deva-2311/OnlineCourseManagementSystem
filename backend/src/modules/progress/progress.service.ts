import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import {
  SafeLessonProgressDto,
  LessonProgressActionResponseDto,
} from './dto/lesson-progress-response.dto';
import {
  CourseProgressSummaryDto,
  LessonProgressDetailDto,
  LessonQuizSummaryDto,
} from './dto/course-progress-summary.dto';
import {
  InstructorCourseProgressQueryDto,
  InstructorCourseProgressResponseDto,
  InstructorStudentProgressItemDto,
} from './dto/instructor-course-progress-query.dto';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
  ) {}

  // ==========================================
  // STUDENT PROGRESS MUTATIONS
  // ==========================================

  async startLessonProgress(
    studentId: string,
    lessonId: string,
  ): Promise<LessonProgressActionResponseDto> {
    const { enrollment } = await this.verifyStudentLessonAccess(
      studentId,
      lessonId,
    );

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    const now = new Date();

    if (!progress) {
      progress = this.progressRepository.create({
        studentId,
        lessonId,
        enrollmentId: enrollment.id,
        status: LessonProgressStatus.IN_PROGRESS,
        startedAt: now,
        lastAccessedAt: now,
      });
    } else {
      // Idempotent: Only advance status if NOT_STARTED
      if (progress.status === LessonProgressStatus.NOT_STARTED) {
        progress.status = LessonProgressStatus.IN_PROGRESS;
        progress.startedAt = now;
      }
      progress.lastAccessedAt = now;
    }

    const saved = await this.progressRepository.save(progress);

    this.logger.log(
      `Started lesson progress: Lesson [${lessonId}] for Student [${studentId}] in Enrollment [${enrollment.id}]`,
    );

    return {
      progress: saved.toSafeProgress(),
      message: 'Lesson progress started successfully.',
    };
  }

  async completeLessonProgress(
    studentId: string,
    lessonId: string,
  ): Promise<LessonProgressActionResponseDto> {
    const { course, enrollment } = await this.verifyStudentLessonAccess(
      studentId,
      lessonId,
    );

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    const now = new Date();

    if (!progress) {
      progress = this.progressRepository.create({
        studentId,
        lessonId,
        enrollmentId: enrollment.id,
        status: LessonProgressStatus.COMPLETED,
        startedAt: now,
        completedAt: now,
        lastAccessedAt: now,
      });
    } else {
      // Idempotent: Preserve original completion timestamp if already completed
      if (progress.status !== LessonProgressStatus.COMPLETED) {
        progress.status = LessonProgressStatus.COMPLETED;
        progress.completedAt = now;
        if (!progress.startedAt) {
          progress.startedAt = now;
        }
      }
      progress.lastAccessedAt = now;
    }

    const saved = await this.progressRepository.save(progress);

    // Compute updated course progress summary
    const summary = await this.calculateCourseProgress(
      enrollment,
      course,
      studentId,
    );

    // If all eligible lessons are completed, transition enrollment to COMPLETED
    if (summary.isCompleted && enrollment.status !== EnrollmentStatus.COMPLETED) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = now;
      await this.enrollmentRepository.save(enrollment);
      this.logger.log(
        `Course completed: Course [${course.id}] completed by Student [${studentId}] (Enrollment: [${enrollment.id}])`,
      );
    }

    this.logger.log(
      `Completed lesson progress: Lesson [${lessonId}] for Student [${studentId}] (Course completion: ${summary.completionPercentage}%)`,
    );

    return {
      progress: saved.toSafeProgress(),
      message: 'Lesson marked as completed successfully.',
      courseProgress: summary,
    };
  }

  // ==========================================
  // STUDENT PROGRESS QUERIES
  // ==========================================

  async getLessonProgress(
    studentId: string,
    lessonId: string,
  ): Promise<SafeLessonProgressDto> {
    const { enrollment } = await this.verifyStudentLessonAccess(
      studentId,
      lessonId,
    );

    const progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    if (progress) {
      return progress.toSafeProgress();
    }

    // Default virtual unstarted progress
    return {
      id: '',
      studentId,
      lessonId,
      enrollmentId: enrollment.id,
      status: LessonProgressStatus.NOT_STARTED,
      startedAt: null,
      completedAt: null,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getCourseProgressByEnrollment(
    studentId: string,
    enrollmentId: string,
  ): Promise<CourseProgressSummaryDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: { course: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID "${enrollmentId}" not found`);
    }

    // Privacy check: Students can only view their own progress
    if (enrollment.studentId !== studentId) {
      throw new ForbiddenException(
        'Access denied: You cannot view another student’s progress',
      );
    }

    // Verified access check
    if (
      enrollment.status !== EnrollmentStatus.ACTIVE &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Access denied: Active enrollment with verified payment required to view course progress',
      );
    }

    return this.calculateCourseProgress(
      enrollment,
      enrollment.course,
      studentId,
    );
  }

  async getCourseProgressByCourseId(
    studentId: string,
    courseId: string,
  ): Promise<CourseProgressSummaryDto> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
      relations: { course: true },
    });

    if (!enrollment) {
      throw new NotFoundException(
        'You are not enrolled in this course',
      );
    }

    if (
      enrollment.status !== EnrollmentStatus.ACTIVE &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Access denied: Active enrollment with verified payment required to view course progress',
      );
    }

    return this.calculateCourseProgress(
      enrollment,
      enrollment.course,
      studentId,
    );
  }

  // ==========================================
  // INSTRUCTOR PROGRESS VISIBILITY
  // ==========================================

  async getCourseProgressForInstructor(
    instructorId: string,
    courseId: string,
    query: InstructorCourseProgressQueryDto,
  ): Promise<InstructorCourseProgressResponseDto> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    // Strict ownership verification
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Access denied: You do not own this course',
      );
    }

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (safePage - 1) * safeLimit;

    const [enrollments, total] = await this.enrollmentRepository.findAndCount({
      where: { courseId },
      relations: { student: true },
      order: { createdAt: 'DESC' },
      skip,
      take: safeLimit,
    });

    // Compute progress for each enrolled student
    const studentProgressItems: InstructorStudentProgressItemDto[] = [];

    for (const enrollment of enrollments) {
      const summary = await this.calculateCourseProgress(
        enrollment,
        course,
        enrollment.studentId,
      );

      studentProgressItems.push({
        student: {
          id: enrollment.student.id,
          email: enrollment.student.email,
          fullName: enrollment.student.fullName,
        },
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt || enrollment.createdAt,
        status: enrollment.status,
        totalLessons: summary.totalLessons,
        completedLessons: summary.completedLessons,
        completionPercentage: summary.completionPercentage,
        lastActivityAt: summary.lastActivityAt,
        isCompleted: summary.isCompleted,
      });
    }

    return {
      data: studentProgressItems,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ==========================================
  // PROGRESS CALCULATION ENGINE
  // ==========================================

  async calculateCourseProgress(
    enrollment: Enrollment,
    course: Course,
    studentId: string,
  ): Promise<CourseProgressSummaryDto> {
    // 1. Fetch all sections and eligible lessons for this course
    const sections = await this.sectionRepository.find({
      where: { courseId: course.id },
      relations: { lessons: true },
      order: {
        displayOrder: 'ASC',
        lessons: { displayOrder: 'ASC' },
      },
    });

    const allLessons: { lesson: Lesson; section: CourseSection }[] = [];
    for (const section of sections) {
      if (section.lessons && section.lessons.length > 0) {
        const sortedLessons = [...section.lessons].sort(
          (a, b) => a.displayOrder - b.displayOrder,
        );
        for (const lesson of sortedLessons) {
          allLessons.push({ lesson, section });
        }
      }
    }

    const totalLessons = allLessons.length;

    // 2. Safe handling of empty curriculum (avoid division by zero)
    if (totalLessons === 0) {
      return {
        courseId: course.id,
        enrollmentId: enrollment.id,
        totalLessons: 0,
        completedLessons: 0,
        inProgressLessons: 0,
        remainingLessons: 0,
        completionPercentage: 0.0,
        lastActivityAt: null,
        isCompleted: false,
        lessons: [],
      };
    }

    // 3. Fetch all progress records for this enrollment
    const progresses = await this.progressRepository.find({
      where: { enrollmentId: enrollment.id },
    });

    const progressMap = new Map<string, LessonProgress>();
    for (const p of progresses) {
      progressMap.set(p.lessonId, p);
    }

    // 4. Fetch safe quiz summaries for lessons in this course
    const eligibleLessonIds = allLessons.map((item) => item.lesson.id);
    const quizzes = await this.quizRepository.find({
      where: { lessonId: In(eligibleLessonIds), isPublished: true },
      relations: { attempts: true },
    });

    const quizMapByLesson = new Map<string, LessonQuizSummaryDto[]>();
    for (const quiz of quizzes) {
      const studentAttempts = (quiz.attempts || []).filter(
        (a) => a.studentId === studentId && a.status === QuizAttemptStatus.SUBMITTED,
      );

      const isPassed = studentAttempts.some((a) => a.isPassed);
      const highestScore = studentAttempts.reduce(
        (max, a) => Math.max(max, Number(a.score)),
        0,
      );
      const maxScore =
        studentAttempts.length > 0
          ? Number(studentAttempts[0].maxScore)
          : Number(quiz.passingScore);

      const quizSummary: LessonQuizSummaryDto = {
        quizId: quiz.id,
        title: quiz.title,
        isPassed,
        highestScore: Math.round(highestScore * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        attemptsCount: studentAttempts.length,
      };

      const existingList = quizMapByLesson.get(quiz.lessonId) || [];
      existingList.push(quizSummary);
      quizMapByLesson.set(quiz.lessonId, existingList);
    }

    // 5. Build per-lesson details
    const lessonDetails: LessonProgressDetailDto[] = [];
    let completedCount = 0;
    let inProgressCount = 0;
    let latestActivity: Date | null = null;

    for (const item of allLessons) {
      const p = progressMap.get(item.lesson.id);
      const status = p ? p.status : LessonProgressStatus.NOT_STARTED;

      if (status === LessonProgressStatus.COMPLETED) {
        completedCount++;
      } else if (status === LessonProgressStatus.IN_PROGRESS) {
        inProgressCount++;
      }

      if (p) {
        const candidateDates = [p.lastAccessedAt, p.completedAt, p.startedAt].filter(
          Boolean,
        ) as Date[];
        for (const d of candidateDates) {
          const dateObj = new Date(d);
          if (!latestActivity || dateObj > latestActivity) {
            latestActivity = dateObj;
          }
        }
      }

      lessonDetails.push({
        lessonId: item.lesson.id,
        title: item.lesson.title,
        sectionId: item.section.id,
        sectionTitle: item.section.title,
        displayOrder: item.lesson.displayOrder,
        status,
        startedAt: p?.startedAt || null,
        completedAt: p?.completedAt || null,
        quizzes: quizMapByLesson.get(item.lesson.id) || [],
      });
    }

    const remainingLessons = totalLessons - completedCount;
    const completionPercentage =
      Math.round((completedCount / totalLessons) * 100 * 100) / 100;
    const isCompleted = completedCount === totalLessons && totalLessons > 0;

    return {
      courseId: course.id,
      enrollmentId: enrollment.id,
      totalLessons,
      completedLessons: completedCount,
      inProgressLessons: inProgressCount,
      remainingLessons,
      completionPercentage,
      lastActivityAt: latestActivity,
      isCompleted,
      lessons: lessonDetails,
    };
  }

  // ==========================================
  // ACCESS CONTROL HELPER
  // ==========================================

  private async verifyStudentLessonAccess(
    studentId: string,
    lessonId: string,
  ): Promise<{ lesson: Lesson; course: Course; enrollment: Enrollment }> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    const course = lesson.section?.course;
    if (!course) {
      throw new NotFoundException(
        'Course associated with this lesson was not found',
      );
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId: course.id },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Access denied: You are not enrolled in the course for this lesson',
      );
    }

    // Verify student has active, paid access
    if (
      enrollment.status !== EnrollmentStatus.ACTIVE &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Access denied: Active enrollment with verified payment required to track progress',
      );
    }

    return { lesson, course, enrollment };
  }
}
