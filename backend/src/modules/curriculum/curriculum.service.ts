import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSection } from './entities/course-section.entity';
import { Lesson } from './entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import {
  SafeSectionDto,
  SafeLessonDto,
  CurriculumOutlineDto,
} from './dto/curriculum-response.dto';

@Injectable()
export class CurriculumService {
  private readonly logger = new Logger(CurriculumService.name);

  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // ==========================================
  // INSTRUCTOR SECTION OPERATIONS
  // ==========================================

  async createSection(
    instructorId: string,
    courseId: string,
    dto: CreateSectionDto,
  ): Promise<SafeSectionDto> {
    // 1. Verify instructor owns the course
    await this.coursesService.findInstructorCourseById(instructorId, courseId);

    // 2. Determine display order if not specified
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const highestSection = await this.sectionRepository.findOne({
        where: { courseId },
        order: { displayOrder: 'DESC' },
      });
      displayOrder = highestSection ? highestSection.displayOrder + 1 : 0;
    }

    const section = this.sectionRepository.create({
      courseId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      displayOrder,
    });

    const saved = await this.sectionRepository.save(section);
    saved.lessons = [];

    this.logger.log(
      `Created Section [${saved.id}] for Course [${courseId}] by Instructor [${instructorId}]`,
    );

    return saved.toSafeSection(true);
  }

  async findCourseSectionsForInstructor(
    instructorId: string,
    courseId: string,
  ): Promise<SafeSectionDto[]> {
    await this.coursesService.findInstructorCourseById(instructorId, courseId);

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: { lessons: true },
      order: {
        displayOrder: 'ASC',
        lessons: { displayOrder: 'ASC' },
      },
    });

    return sections.map((s) => s.toSafeSection(true));
  }

  async updateSection(
    instructorId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<SafeSectionDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: { course: true, lessons: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course section');
    }

    if (dto.title !== undefined) {
      section.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      section.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.displayOrder !== undefined) {
      section.displayOrder = dto.displayOrder;
    }

    const updated = await this.sectionRepository.save(section);
    return updated.toSafeSection(true);
  }

  async deleteSection(
    instructorId: string,
    sectionId: string,
  ): Promise<{ message: string }> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: { course: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course section');
    }

    await this.sectionRepository.remove(section);
    this.logger.log(`Deleted Section [${sectionId}] from Course [${section.courseId}]`);

    return { message: 'Section successfully deleted' };
  }

  // ==========================================
  // INSTRUCTOR LESSON OPERATIONS
  // ==========================================

  async createLesson(
    instructorId: string,
    sectionId: string,
    dto: CreateLessonDto,
  ): Promise<SafeLessonDto> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: { course: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course section');
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const highestLesson = await this.lessonRepository.findOne({
        where: { sectionId },
        order: { displayOrder: 'DESC' },
      });
      displayOrder = highestLesson ? highestLesson.displayOrder + 1 : 0;
    }

    const sanitizedText = this.sanitizeTextContent(dto.textContent);

    const lesson = this.lessonRepository.create({
      sectionId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      contentType: dto.contentType,
      textContent: sanitizedText || null,
      videoUrl: dto.videoUrl?.trim() || null,
      contentUrl: dto.contentUrl?.trim() || null,
      estimatedDuration: dto.estimatedDuration || 0,
      displayOrder,
      isPreview: dto.isPreview || false,
    });

    const saved = await this.lessonRepository.save(lesson);

    this.logger.log(
      `Created Lesson [${saved.id}] in Section [${sectionId}] by Instructor [${instructorId}]`,
    );

    return saved.toSafeLesson(true);
  }

  async findSectionLessonsForInstructor(
    instructorId: string,
    sectionId: string,
  ): Promise<SafeLessonDto[]> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: { course: true },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    if (section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course section');
    }

    const lessons = await this.lessonRepository.find({
      where: { sectionId },
      order: { displayOrder: 'ASC' },
    });

    return lessons.map((l) => l.toSafeLesson(true));
  }

  async updateLesson(
    instructorId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ): Promise<SafeLessonDto> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    if (lesson.section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this lesson');
    }

    if (dto.title !== undefined) {
      lesson.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      lesson.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.contentType !== undefined) {
      lesson.contentType = dto.contentType;
    }
    if (dto.textContent !== undefined) {
      lesson.textContent = this.sanitizeTextContent(dto.textContent) || null;
    }
    if (dto.videoUrl !== undefined) {
      lesson.videoUrl = dto.videoUrl ? dto.videoUrl.trim() : null;
    }
    if (dto.contentUrl !== undefined) {
      lesson.contentUrl = dto.contentUrl ? dto.contentUrl.trim() : null;
    }
    if (dto.estimatedDuration !== undefined) {
      lesson.estimatedDuration = dto.estimatedDuration;
    }
    if (dto.displayOrder !== undefined) {
      lesson.displayOrder = dto.displayOrder;
    }
    if (dto.isPreview !== undefined) {
      lesson.isPreview = dto.isPreview;
    }

    const updated = await this.lessonRepository.save(lesson);
    return updated.toSafeLesson(true);
  }

  async deleteLesson(
    instructorId: string,
    lessonId: string,
  ): Promise<{ message: string }> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    if (lesson.section.course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this lesson');
    }

    await this.lessonRepository.remove(lesson);
    this.logger.log(`Deleted Lesson [${lessonId}] from Section [${lesson.sectionId}]`);

    return { message: 'Lesson successfully deleted' };
  }

  // ==========================================
  // STUDENT / PUBLIC CURRICULUM ACCESS
  // ==========================================

  async getCourseCurriculum(
    courseId: string,
    currentUser?: { id: string; role: UserRole },
  ): Promise<CurriculumOutlineDto> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    // Determine access privileges
    let hasAccess = false;

    if (currentUser) {
      if (currentUser.role === UserRole.ADMIN) {
        hasAccess = true;
      } else if (
        currentUser.role === UserRole.INSTRUCTOR &&
        course.instructorId === currentUser.id
      ) {
        hasAccess = true;
      } else if (currentUser.role === UserRole.STUDENT) {
        hasAccess = await this.enrollmentsService.hasAccessToCourse(
          currentUser.id,
          course.id,
        );
      }
    }

    // Protect unpublished courses from non-authorized viewers
    if (course.status !== CourseStatus.PUBLISHED && !hasAccess) {
      throw new NotFoundException(
        `Course "${courseId}" not found or is not currently published`,
      );
    }

    const sections = await this.sectionRepository.find({
      where: { courseId },
      relations: { lessons: true },
      order: {
        displayOrder: 'ASC',
        lessons: { displayOrder: 'ASC' },
      },
    });

    return {
      courseId: course.id,
      courseTitle: course.title,
      hasAccess,
      sections: sections.map((s) => s.toSafeSection(hasAccess)),
    };
  }

  async getLessonById(
    lessonId: string,
    currentUser?: { id: string; role: UserRole },
  ): Promise<SafeLessonDto> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    const course = lesson.section?.course;
    if (!course) {
      throw new NotFoundException('Course associated with lesson not found');
    }

    // 1. Admin or Course Owner Instructor access
    if (currentUser) {
      if (currentUser.role === UserRole.ADMIN) {
        return lesson.toSafeLesson(true);
      }
      if (
        currentUser.role === UserRole.INSTRUCTOR &&
        course.instructorId === currentUser.id
      ) {
        return lesson.toSafeLesson(true);
      }
    }

    // 2. Preview lessons in published courses are accessible to anyone
    if (lesson.isPreview && course.status === CourseStatus.PUBLISHED) {
      return lesson.toSafeLesson(true);
    }

    // 3. Unpublished courses cannot leak protected lessons
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException('Lesson not found or course is not published');
    }

    // 4. Require authentication for non-preview content
    if (!currentUser) {
      throw new UnauthorizedException(
        'Authentication required to access protected lesson content',
      );
    }

    // 5. If instructor does not own this course, deny
    if (currentUser.role === UserRole.INSTRUCTOR) {
      throw new ForbiddenException(
        'Access denied: You do not own this course and cannot view non-preview content',
      );
    }

    // 6. Student verified access check
    if (currentUser.role === UserRole.STUDENT) {
      const isEnrolledAndVerified =
        await this.enrollmentsService.hasAccessToCourse(currentUser.id, course.id);

      if (isEnrolledAndVerified) {
        return lesson.toSafeLesson(true);
      }

      throw new ForbiddenException(
        'Access denied: You must be enrolled in this course with verified payment to access this lesson',
      );
    }

    throw new ForbiddenException('Access denied to lesson content');
  }

  // ==========================================
  // SECURITY SANITIZER HELPER
  // ==========================================

  private sanitizeTextContent(text?: string): string | undefined {
    if (!text) return undefined;
    // Strip malicious script tags, iframes, and javascript: protocols
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }
}
