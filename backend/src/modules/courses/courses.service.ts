import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseStatus } from './enums/course-status.enum';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto, CourseSort } from './dto/course-query.dto';
import { CategoriesService } from '../categories/categories.service';
import { slugify } from '../../common/utils/slugify.util';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email/email.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { courseApprovedTemplate, courseRejectedTemplate } from '../notifications/email/email.templates';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditResourceType } from '../audit-log/enums/audit-action.enum';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly categoriesService: CategoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==========================================
  // INSTRUCTOR OPERATIONS
  // ==========================================

  async createDraft(instructorId: string, dto: CreateCourseDto): Promise<Course> {
    // 1. Verify category existence
    await this.categoriesService.findById(dto.categoryId);

    // 2. Generate unique slug
    const slug = await this.generateUniqueSlug(dto.title);

    // 3. Create course in DRAFT status
    const course = this.courseRepository.create({
      title: dto.title.trim(),
      slug,
      shortDescription: dto.shortDescription?.trim(),
      description: dto.description.trim(),
      thumbnailUrl: dto.thumbnailUrl?.trim(),
      instructorId,
      categoryId: dto.categoryId,
      difficultyLevel: dto.difficultyLevel,
      estimatedDuration: dto.estimatedDuration || 0,
      price: dto.price !== undefined ? dto.price : 0.0,
      currency: dto.currency || 'USD',
      prerequisites: dto.prerequisites || [],
      learningOutcomes: dto.learningOutcomes || [],
      status: CourseStatus.DRAFT,
      rejectionReason: null,
      publishedAt: null,
    });

    return this.courseRepository.save(course);
  }

  async findInstructorCourses(instructorId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { instructorId },
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findInstructorCourseById(instructorId: string, courseId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { category: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course');
    }

    return course;
  }

  async updateInstructorCourse(
    instructorId: string,
    courseId: string,
    dto: UpdateCourseDto,
  ): Promise<Course> {
    const course = await this.findInstructorCourseById(instructorId, courseId);

    // Lifecycle rule: Cannot edit while awaiting administrative review
    if (course.status === CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Cannot update a course that is currently pending review. Please wait for moderation or contact support.',
      );
    }

    // Safe policy: Editing an already PUBLISHED course requires re-review before changes are live
    if (course.status === CourseStatus.PUBLISHED) {
      course.status = CourseStatus.PENDING_REVIEW;
      course.publishedAt = null;
    } else if (course.status === CourseStatus.REJECTED) {
      // Editing a rejected course returns it to DRAFT for revision
      course.status = CourseStatus.DRAFT;
      course.rejectionReason = null;
    }

    if (dto.categoryId) {
      await this.categoriesService.findById(dto.categoryId);
      course.categoryId = dto.categoryId;
    }

    if (dto.title && dto.title.trim() !== course.title) {
      course.title = dto.title.trim();
      course.slug = await this.generateUniqueSlug(course.title, course.id);
    }

    if (dto.shortDescription !== undefined) course.shortDescription = dto.shortDescription?.trim();
    if (dto.description !== undefined) course.description = dto.description.trim();
    if (dto.thumbnailUrl !== undefined) course.thumbnailUrl = dto.thumbnailUrl?.trim();
    if (dto.difficultyLevel !== undefined) course.difficultyLevel = dto.difficultyLevel;
    if (dto.estimatedDuration !== undefined) course.estimatedDuration = dto.estimatedDuration;
    if (dto.price !== undefined) course.price = dto.price;
    if (dto.currency !== undefined) course.currency = dto.currency;
    if (dto.prerequisites !== undefined) course.prerequisites = dto.prerequisites;
    if (dto.learningOutcomes !== undefined) course.learningOutcomes = dto.learningOutcomes;

    return this.courseRepository.save(course);
  }

  async deleteInstructorCourse(
    instructorId: string,
    courseId: string,
  ): Promise<{ message: string }> {
    const course = await this.findInstructorCourseById(instructorId, courseId);

    // Lifecycle rule: Only DRAFT or REJECTED courses may be deleted
    if (course.status === CourseStatus.PUBLISHED || course.status === CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot delete a course with status "${course.status}". Only DRAFT or REJECTED courses may be deleted.`,
      );
    }

    await this.courseRepository.remove(course);
    return { message: 'Course successfully deleted' };
  }

  async submitForReview(instructorId: string, courseId: string): Promise<Course> {
    const course = await this.findInstructorCourseById(instructorId, courseId);

    if (course.status === CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException('Course is already submitted and pending review');
    }

    if (course.status === CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is already published');
    }

    // Content completeness validation before review
    if (!course.title || course.title.length < 5) {
      throw new BadRequestException('Course title must have at least 5 characters');
    }

    if (!course.description || course.description.length < 20) {
      throw new BadRequestException('Course description must have at least 20 characters');
    }

    if (!course.categoryId) {
      throw new BadRequestException('Course must belong to a valid category');
    }

    if (!course.learningOutcomes || course.learningOutcomes.length === 0) {
      throw new BadRequestException('Course must contain at least one learning outcome before submission');
    }

    course.status = CourseStatus.PENDING_REVIEW;
    course.rejectionReason = null;

    const saved = await this.courseRepository.save(course);

    void this.auditLogService.log({
      actorId: instructorId,
      action: AuditAction.COURSE_SUBMITTED_FOR_REVIEW,
      resourceType: AuditResourceType.COURSE,
      resourceId: course.id,
      metadata: { courseTitle: course.title },
    });

    return saved;
  }

  // ==========================================
  // PUBLIC DISCOVERY OPERATIONS
  // ==========================================

  async findPublishedCourses(query: CourseQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    if (query.search) {
      const searchParam = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(course.title) LIKE :search OR LOWER(course.description) LIKE :search)',
        { search: searchParam },
      );
    }

    if (query.categoryId) {
      qb.andWhere('course.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug: query.categorySlug.trim() });
    }

    if (query.difficultyLevel) {
      qb.andWhere('course.difficultyLevel = :difficultyLevel', {
        difficultyLevel: query.difficultyLevel,
      });
    }

    if (query.isFree) {
      qb.andWhere('course.price = 0');
    } else {
      if (query.minPrice !== undefined) {
        qb.andWhere('course.price >= :minPrice', { minPrice: query.minPrice });
      }
      if (query.maxPrice !== undefined) {
        qb.andWhere('course.price <= :maxPrice', { maxPrice: query.maxPrice });
      }
    }

    // Whitelisted sort order
    switch (query.sort) {
      case CourseSort.TITLE:
        qb.orderBy('course.title', 'ASC');
        break;
      case CourseSort.PRICE_ASC:
        qb.orderBy('course.price', 'ASC');
        break;
      case CourseSort.PRICE_DESC:
        qb.orderBy('course.price', 'DESC');
        break;
      case CourseSort.NEWEST:
      default:
        qb.orderBy('course.createdAt', 'DESC');
        break;
    }

    qb.skip(skip).take(limit);

    const [courses, total] = await qb.getManyAndCount();

    return {
      data: courses.map((c) => c.toPublicCourse()),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublishedCourseByIdOrSlug(idOrSlug: string) {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    if (isUuid) {
      qb.andWhere('course.id = :idOrSlug', { idOrSlug });
    } else {
      qb.andWhere('course.slug = :idOrSlug', { idOrSlug });
    }

    const course = await qb.getOne();

    if (!course) {
      throw new NotFoundException(`Course "${idOrSlug}" not found or is not currently published`);
    }

    return course.toPublicCourse();
  }

  // ==========================================
  // ADMINISTRATOR MODERATION OPERATIONS
  // ==========================================

  async findAllAdminCourses(page = 1, limit = 10, status?: CourseStatus) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor');

    if (status) {
      qb.where('course.status = :status', { status });
    }

    qb.orderBy('course.createdAt', 'DESC').skip(skip).take(safeLimit);

    const [courses, total] = await qb.getManyAndCount();

    return {
      data: courses,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findPendingCourses(page = 1, limit = 10) {
    return this.findAllAdminCourses(page, limit, CourseStatus.PENDING_REVIEW);
  }

  async approveCourse(courseId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { category: true, instructor: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot approve course. Current status is "${course.status}". Only courses with status "PENDING_REVIEW" can be approved.`,
      );
    }

    course.status = CourseStatus.PUBLISHED;
    course.publishedAt = new Date();
    course.rejectionReason = null;

    const saved = await this.courseRepository.save(course);

    // Audit log (admin moderation)
    void this.auditLogService.log({
      action: AuditAction.COURSE_APPROVED,
      resourceType: AuditResourceType.COURSE,
      resourceId: course.id,
      metadata: { courseTitle: course.title, instructorId: course.instructorId },
    });

    // Notify instructor (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    void this.notificationsService.createNotification({
      userId: course.instructorId,
      type: NotificationType.COURSE_APPROVED,
      title: `Course approved: ${course.title}`,
      message: `Your course "${course.title}" has been reviewed and is now published.`,
      actionUrl: `/instructor/courses/${course.id}`,
      metadata: { courseId: course.id },
    });
    if (course.instructor?.email) {
      const tpl = courseApprovedTemplate({
        fullName: course.instructor.fullName,
        courseTitle: course.title,
        courseUrl: `${frontendUrl}/courses/${course.slug}`,
      });
      void this.emailService.sendMail({ to: course.instructor.email, ...tpl });
    }

    return saved;
  }

  async rejectCourse(courseId: string, rejectionReason: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { category: true, instructor: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot reject course. Current status is "${course.status}". Only courses with status "PENDING_REVIEW" can be rejected.`,
      );
    }

    course.status = CourseStatus.REJECTED;
    course.rejectionReason = rejectionReason.trim();
    course.publishedAt = null;

    const saved = await this.courseRepository.save(course);

    // Audit log (admin moderation)
    void this.auditLogService.log({
      action: AuditAction.COURSE_REJECTED,
      resourceType: AuditResourceType.COURSE,
      resourceId: course.id,
      metadata: { courseTitle: course.title, instructorId: course.instructorId, rejectionReason: course.rejectionReason },
    });

    // Notify instructor (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    void this.notificationsService.createNotification({
      userId: course.instructorId,
      type: NotificationType.COURSE_REJECTED,
      title: `Course not approved: ${course.title}`,
      message: `Your course "${course.title}" was not approved. Please review the feedback and resubmit.`,
      actionUrl: `/instructor/courses/${course.id}/edit`,
      metadata: { courseId: course.id, rejectionReason: course.rejectionReason },
    });
    if (course.instructor?.email) {
      const tpl = courseRejectedTemplate({
        fullName: course.instructor.fullName,
        courseTitle: course.title,
        rejectionReason: course.rejectionReason,
        editUrl: `${frontendUrl}/instructor/courses/${course.id}/edit`,
      });
      void this.emailService.sendMail({ to: course.instructor.email, ...tpl });
    }

    return saved;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async generateUniqueSlug(title: string, excludeCourseId?: string): Promise<string> {
    const baseSlug = slugify(title);
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const qb = this.courseRepository
        .createQueryBuilder('course')
        .where('course.slug = :slug', { slug: candidate });

      if (excludeCourseId) {
        qb.andWhere('course.id != :excludeCourseId', { excludeCourseId });
      }

      const existing = await qb.getOne();
      if (!existing) {
        return candidate;
      }

      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }
}
