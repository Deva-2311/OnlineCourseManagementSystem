import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { DifficultyLevel } from '../courses/enums/difficulty-level.enum';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import {
  RecommendationResponseDto,
  RecommendedCourseItemDto,
} from './dto/recommendation-response.dto';

interface ScoredCandidate {
  course: Course;
  score: number;
  primaryReason: string;
  signals: string[];
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
  ) {}

  /**
   * Generates deterministic, rule-based course recommendations for the authenticated student.
   * Excludes already enrolled or completed courses, unpublished courses, and courses
   * with unmet prerequisites. Provides transparent reasons and fallback for new students.
   */
  async getRecommendationsForStudent(
    studentId: string,
    query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto> {
    const limit = query.limit ?? 6;

    // 1. Fetch student's enrollments to extract learning history and exclusions
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId },
      relations: { course: { category: true } },
    });

    const enrolledCourseIds = new Set<string>();
    const completedCourseIds = new Set<string>();
    const satisfiedPrerequisiteIdentifiers = new Set<string>();
    const categoryEnrollmentCounts = new Map<string, number>();
    const completedCategoryDifficulties = new Map<string, Set<DifficultyLevel>>();

    for (const enrollment of enrollments) {
      // Exclude courses already enrolled in or completed or pending payment
      if (
        enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED ||
        enrollment.status === EnrollmentStatus.PENDING_PAYMENT
      ) {
        enrolledCourseIds.add(enrollment.courseId.toLowerCase());
      }

      // Satisfied prerequisite records: Active or Completed enrollments
      if (
        enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED
      ) {
        satisfiedPrerequisiteIdentifiers.add(enrollment.courseId.toLowerCase());
        if (enrollment.course?.title) {
          satisfiedPrerequisiteIdentifiers.add(enrollment.course.title.toLowerCase().trim());
        }
        if (enrollment.course?.slug) {
          satisfiedPrerequisiteIdentifiers.add(enrollment.course.slug.toLowerCase().trim());
        }

        // Tally category interactions
        if (enrollment.course?.categoryId) {
          const currentCount = categoryEnrollmentCounts.get(enrollment.course.categoryId) || 0;
          categoryEnrollmentCounts.set(enrollment.course.categoryId, currentCount + 1);
        }
      }

      // Track completed course identifiers specifically
      if (enrollment.status === EnrollmentStatus.COMPLETED && enrollment.course) {
        completedCourseIds.add(enrollment.course.id.toLowerCase());
        if (enrollment.course.categoryId) {
          if (!completedCategoryDifficulties.has(enrollment.course.categoryId)) {
            completedCategoryDifficulties.set(enrollment.course.categoryId, new Set());
          }
          completedCategoryDifficulties
            .get(enrollment.course.categoryId)!
            .add(enrollment.course.difficultyLevel);
        }
      }
    }

    // 2. Fetch quiz attempts for learning reinforcement signals
    const attempts = await this.quizAttemptRepository.find({
      where: { studentId },
      relations: {
        quiz: {
          lesson: {
            section: {
              course: true,
            },
          },
        },
      },
    });

    const passedQuizCategoryIds = new Set<string>();
    const quizCategoryPassFail = new Map<string, { passed: number; failed: number }>();

    for (const attempt of attempts) {
      const categoryId = attempt.quiz?.lesson?.section?.course?.categoryId;
      if (!categoryId) continue;

      if (!quizCategoryPassFail.has(categoryId)) {
        quizCategoryPassFail.set(categoryId, { passed: 0, failed: 0 });
      }
      const record = quizCategoryPassFail.get(categoryId)!;

      if (attempt.isPassed) {
        record.passed++;
        passedQuizCategoryIds.add(categoryId);
      } else {
        record.failed++;
      }
    }

    // 3. Query published candidate courses (excluding already enrolled courses)
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED });

    if (enrolledCourseIds.size > 0) {
      qb.andWhere('course.id NOT IN (:...enrolledIds)', {
        enrolledIds: Array.from(enrolledCourseIds),
      });
    }

    if (query.categoryId) {
      qb.andWhere('course.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.difficultyLevel) {
      qb.andWhere('course.difficultyLevel = :difficultyLevel', {
        difficultyLevel: query.difficultyLevel,
      });
    }

    const candidateCourses = await qb.getMany();

    // 4. Filter candidate courses by prerequisite eligibility
    // Pre-load all courses in the DB to validate prerequisites in memory without N+1 queries
    const allExistingCourses = await this.courseRepository.find({
      select: { id: true, title: true, slug: true },
    });

    const courseLookupById = new Map<string, { id: string; title: string; slug: string }>();
    const courseLookupByTitle = new Map<string, { id: string; title: string; slug: string }>();
    const courseLookupBySlug = new Map<string, { id: string; title: string; slug: string }>();

    for (const c of allExistingCourses) {
      courseLookupById.set(c.id.toLowerCase(), c);
      courseLookupByTitle.set(c.title.toLowerCase().trim(), c);
      courseLookupBySlug.set(c.slug.toLowerCase().trim(), c);
    }

    const eligibleCourses: Course[] = [];

    for (const course of candidateCourses) {
      let prerequisitesMet = true;

      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereq of course.prerequisites) {
          const normalized = prereq.toLowerCase().trim();
          const matchedCourse =
            courseLookupById.get(normalized) ||
            courseLookupByTitle.get(normalized) ||
            courseLookupBySlug.get(normalized);

          // If prerequisite is an existing course in the system, student MUST have completed or enrolled in it
          if (matchedCourse && !satisfiedPrerequisiteIdentifiers.has(matchedCourse.id.toLowerCase())) {
            prerequisitesMet = false;
            break;
          }
        }
      }

      if (prerequisitesMet) {
        eligibleCourses.push(course);
      }
    }

    // 5. Determine if student is a new student (fallback scenario)
    const hasEnrollmentHistory = categoryEnrollmentCounts.size > 0;
    const isFallback = !hasEnrollmentHistory;

    // 6. Score and rank eligible courses
    const scoredCandidates: ScoredCandidate[] = [];

    for (const course of eligibleCourses) {
      let score = 0;
      const signals: string[] = [];
      const categoryName = course.category?.name || 'this subject';

      if (isFallback) {
        // Fallback for new students with no history
        score = 10;
        if (course.difficultyLevel === DifficultyLevel.BEGINNER) {
          score += 10;
          signals.push('Featured introductory course for new learners');
        } else {
          signals.push(`Popular published course in ${categoryName}`);
        }
      } else {
        // --- Signal A: Category Affinity ---
        const categoryEnrolledCount = categoryEnrollmentCounts.get(course.categoryId);
        if (categoryEnrolledCount && categoryEnrolledCount > 0) {
          const categoryBoost = 30 + Math.min(categoryEnrolledCount * 5, 15);
          score += categoryBoost;
          signals.push(`Matches your active learning interest in ${categoryName}`);
        }

        // --- Signal B: Direct Prerequisite Progression ---
        let followsPrerequisite = false;
        if (course.prerequisites && course.prerequisites.length > 0) {
          for (const prereq of course.prerequisites) {
            const normalized = prereq.toLowerCase().trim();
            const matchedCourse =
              courseLookupById.get(normalized) ||
              courseLookupByTitle.get(normalized) ||
              courseLookupBySlug.get(normalized);

            if (matchedCourse && completedCourseIds.has(matchedCourse.id.toLowerCase())) {
              followsPrerequisite = true;
              break;
            }
          }
        }

        if (followsPrerequisite) {
          score += 40; // High value: direct curriculum sequel
          signals.push('Direct progression following your completed coursework');
        }

        // --- Signal C: Difficulty Level Progression ---
        const completedLevels = completedCategoryDifficulties.get(course.categoryId);
        if (completedLevels) {
          if (
            completedLevels.has(DifficultyLevel.BEGINNER) &&
            course.difficultyLevel === DifficultyLevel.INTERMEDIATE
          ) {
            score += 25;
            signals.push(`Next level of challenge: Intermediate progression in ${categoryName}`);
          } else if (
            completedLevels.has(DifficultyLevel.INTERMEDIATE) &&
            course.difficultyLevel === DifficultyLevel.ADVANCED
          ) {
            score += 25;
            signals.push(`Advanced course building on your intermediate mastery`);
          } else if (
            completedLevels.has(DifficultyLevel.BEGINNER) &&
            course.difficultyLevel === DifficultyLevel.BEGINNER
          ) {
            score += 15;
            signals.push(`Reinforces core foundational skills in ${categoryName}`);
          }
        } else if (course.difficultyLevel === DifficultyLevel.BEGINNER) {
          // Unexplored category: beginner friendly
          score += 10;
          signals.push(`Introductory entry point into ${categoryName}`);
        }

        // --- Signal D: Assessment / Quiz Performance ---
        if (passedQuizCategoryIds.has(course.categoryId)) {
          score += 15;
          signals.push(`Builds on topics where you demonstrated quiz proficiency`);
        } else {
          const quizRecord = quizCategoryPassFail.get(course.categoryId);
          if (quizRecord && quizRecord.failed > 0 && course.difficultyLevel === DifficultyLevel.BEGINNER) {
            score += 20;
            signals.push(`Reinforces foundational concepts where assessment review was suggested`);
          }
        }

        // Default discovery signal if no specific signals fired
        if (signals.length === 0) {
          score = 5;
          signals.push(`Explore new learning opportunities in ${categoryName}`);
        }
      }

      scoredCandidates.push({
        course,
        score,
        primaryReason: signals[0] || `Recommended course in ${categoryName}`,
        signals,
      });
    }

    // 7. Deterministic Ranking & Tie-breaking:
    // Rule 1: Score DESC
    // Rule 2: Published date DESC (or created date)
    // Rule 3: Title ASC (alphabetical)
    // Rule 4: ID ASC (deterministic guarantee)
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const timeA =
        a.course.publishedAt?.getTime() || a.course.createdAt?.getTime() || 0;
      const timeB =
        b.course.publishedAt?.getTime() || b.course.createdAt?.getTime() || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      const titleCompare = a.course.title.localeCompare(b.course.title);
      if (titleCompare !== 0) {
        return titleCompare;
      }

      return a.course.id.localeCompare(b.course.id);
    });

    // 8. Paginate / Slice to requested limit
    const sliced = scoredCandidates.slice(0, limit);

    const items: RecommendedCourseItemDto[] = sliced.map((item) => ({
      course: item.course.toPublicCourse(),
      reason: item.primaryReason,
      score: item.score,
      signals: item.signals,
    }));

    return {
      data: items,
      meta: {
        total: items.length,
        limit,
        isFallback,
      },
    };
  }
}
