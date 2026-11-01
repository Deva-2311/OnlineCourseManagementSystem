import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { LessonProgressStatus } from '../progress/enums/lesson-progress-status.enum';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';
import { buildCsvString } from '../../common/utils/csv.util';

// ─── Date Helpers ───────────────────────────────────────────────
export type DatePeriod = '7d' | '30d' | '90d' | 'custom';

function resolveRange(
  period: DatePeriod,
  from?: string,
  to?: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'custom') {
    if (!from || !to) {
      throw new BadRequestException(
        'from and to are required when period=custom',
      );
    }
    const f = new Date(from);
    const t = new Date(to);
    t.setUTCHours(23, 59, 59, 999);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) {
      throw new BadRequestException('Invalid date format for from/to');
    }
    if (f > t) {
      throw new BadRequestException('from must be before to');
    }
    return { from: f, to: t };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const f = new Date(now);
  f.setUTCDate(f.getUTCDate() - days);
  f.setUTCHours(0, 0, 0, 0);
  return { from: f, to: now };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Certificate)
    private readonly certRepo: Repository<Certificate>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    @InjectRepository(LessonProgress)
    private readonly progressRepo: Repository<LessonProgress>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // ADMIN: OVERVIEW
  // Metrics are calculated via COUNT/SUM aggregates in PostgreSQL
  // ============================================================

  async getAdminOverview() {
    const [
      totalUsers,
      studentCount,
      instructorCount,
      adminCount,
      totalCourses,
      publishedCourses,
      pendingCourses,
      draftCourses,
      rejectedCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalCertificates,
      totalAttempts,
      passedAttempts,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.STUDENT } }),
      this.userRepo.count({ where: { role: UserRole.INSTRUCTOR } }),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
      this.courseRepo.count(),
      this.courseRepo.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.courseRepo.count({ where: { status: CourseStatus.PENDING_REVIEW } }),
      this.courseRepo.count({ where: { status: CourseStatus.DRAFT } }),
      this.courseRepo.count({ where: { status: CourseStatus.REJECTED } }),
      this.enrollmentRepo.count(),
      this.enrollmentRepo.count({ where: { status: EnrollmentStatus.ACTIVE } }),
      this.enrollmentRepo.count({ where: { status: EnrollmentStatus.COMPLETED } }),
      this.certRepo.count(),
      this.attemptRepo.count({ where: { status: QuizAttemptStatus.SUBMITTED } }),
      this.attemptRepo.count({ where: { status: QuizAttemptStatus.SUBMITTED, isPassed: true } }),
    ]);

    // Revenue: SUM of SUCCEEDED payments grouped by currency
    const revenueRows: { currency: string; total: string }[] =
      await this.dataSource.query(`
        SELECT currency, SUM(amount) AS total
        FROM payments
        WHERE status = 'SUCCEEDED'
        GROUP BY currency
        ORDER BY currency
      `);

    const revenue = revenueRows.map((r) => ({
      currency: r.currency,
      total: Number(r.total),
    }));

    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
        : 0;

    const quizPassRate =
      totalAttempts > 0
        ? Math.round((passedAttempts / totalAttempts) * 10000) / 100
        : 0;

    // Recent administrative activity from audit log
    const recentActivityRows: {
      id: string;
      actorEmail: string | null;
      actorRole: string | null;
      action: string;
      outcome: string;
      createdAt: string;
    }[] = await this.dataSource.query(`
      SELECT id, "actorEmail", "actorRole", action, outcome, "createdAt"
      FROM audit_logs
      ORDER BY "createdAt" DESC
      LIMIT 8
    `);

    return {
      users: {
        total: totalUsers,
        students: studentCount,
        instructors: instructorCount,
        admins: adminCount,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        pendingReview: pendingCourses,
        draft: draftCourses,
        rejected: rejectedCourses,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRatePercent: completionRate,
      },
      revenue,
      certificates: { total: totalCertificates },
      quizzes: {
        totalAttempts,
        passedAttempts,
        passRatePercent: quizPassRate,
      },
      recentActivity: recentActivityRows || [],
    };
  }

  // ============================================================
  // ADMIN: ENROLLMENT TRENDS
  // Daily new enrollment counts over the selected period.
  // ============================================================

  async getEnrollmentTrends(
    period: DatePeriod = '30d',
    from?: string,
    to?: string,
  ) {
    const range = resolveRange(period, from, to);

    const rows: { day: string; count: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::DATE::TEXT AS day,
          COUNT(*)::TEXT AS count
        FROM enrollments
        WHERE "createdAt" >= $1 AND "createdAt" <= $2
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        [range.from, range.to],
      );

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      data: rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    };
  }

  // ============================================================
  // ADMIN: USER GROWTH TRENDS
  // ============================================================

  async getUserGrowthTrends(
    period: DatePeriod = '30d',
    from?: string,
    to?: string,
  ) {
    const range = resolveRange(period, from, to);

    const rows: { day: string; count: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::DATE::TEXT AS day,
          COUNT(*)::TEXT AS count
        FROM users
        WHERE "createdAt" >= $1 AND "createdAt" <= $2
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        [range.from, range.to],
      );

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      data: rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    };
  }

  // ============================================================
  // ADMIN: COURSE ANALYTICS
  // Top courses by enrollment count + completion rates.
  // ============================================================

  async getCourseAnalytics(
    optsOrLimit:
      | number
      | {
          page?: number;
          limit?: number;
          search?: string;
          status?: string;
          sortBy?: string;
          sortOrder?: string;
        } = 20,
  ) {
    let page = 1;
    let limit = 20;
    let search: string | undefined;
    let status: string | undefined;
    let sortBy = 'enrollments';
    let sortOrder = 'DESC';

    if (typeof optsOrLimit === 'number') {
      limit = optsOrLimit;
    } else if (typeof optsOrLimit === 'object' && optsOrLimit !== null) {
      page = Math.max(1, Number(optsOrLimit.page) || 1);
      limit = Number(optsOrLimit.limit) || 20;
      search = optsOrLimit.search;
      status = optsOrLimit.status;
      if (optsOrLimit.sortBy) sortBy = optsOrLimit.sortBy;
      if (optsOrLimit.sortOrder)
        sortOrder = optsOrLimit.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    }

    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * safeLimit;

    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (status) {
      params.push(status);
      whereClauses.push(`c.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`c.title ILIKE $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderCol = 'COUNT(e.id)';
    if (sortBy === 'completionRate') {
      orderCol = 'CASE WHEN COUNT(e.id) > 0 THEN (COUNT(e.id) FILTER (WHERE e.status = \'COMPLETED\')::FLOAT / COUNT(e.id)) ELSE 0 END';
    } else if (sortBy === 'title') {
      orderCol = 'c.title';
    } else if (sortBy === 'createdAt') {
      orderCol = 'c."createdAt"';
    }

    params.push(safeLimit);
    const limitParamIdx = params.length;

    let offsetClause = '';
    if (typeof optsOrLimit === 'object' && optsOrLimit !== null && (optsOrLimit.page || optsOrLimit.search || optsOrLimit.status || optsOrLimit.sortBy)) {
      params.push(skip);
      offsetClause = `OFFSET $${params.length}`;
    }

    const rows: {
      courseId: string;
      title: string;
      status: string;
      totalEnrollments: string;
      activeEnrollments: string;
      completedEnrollments: string;
      totalCount?: string;
    }[] = await this.dataSource.query(
      `
      SELECT
        c.id                                              AS "courseId",
        c.title,
        c.status,
        COUNT(e.id)::TEXT                                 AS "totalEnrollments",
        COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE')::TEXT   AS "activeEnrollments",
        COUNT(e.id) FILTER (WHERE e.status = 'COMPLETED')::TEXT AS "completedEnrollments",
        COUNT(*) OVER()::TEXT                             AS "totalCount"
      FROM courses c
      LEFT JOIN enrollments e ON e."courseId" = c.id
      ${whereSql}
      GROUP BY c.id, c.title, c.status, c."createdAt"
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT $${limitParamIdx} ${offsetClause}
    `,
      params,
    );

    const total = rows.length > 0 && rows[0].totalCount ? Number(rows[0].totalCount) : rows.length;

    return {
      data: rows.map((r) => {
        const tot = Number(r.totalEnrollments);
        const completed = Number(r.completedEnrollments);
        return {
          courseId: r.courseId,
          title: r.title,
          status: r.status,
          totalEnrollments: tot,
          activeEnrollments: Number(r.activeEnrollments),
          completedEnrollments: completed,
          completionRatePercent:
            tot > 0 ? Math.round((completed / tot) * 10000) / 100 : 0,
        };
      }),
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  }

  // ============================================================
  // ADMIN: PAYMENT ANALYTICS
  // Only SUCCEEDED payments; kept per-currency.
  // ============================================================

  async getPaymentAnalytics(
    period: DatePeriod = '30d',
    from?: string,
    to?: string,
  ) {
    const range = resolveRange(period, from, to);

    const [summaryRows, trendRows] = await Promise.all([
      this.dataSource.query<{ currency: string; total: string; txCount: string }[]>(
        `
        SELECT currency, SUM(amount) AS total, COUNT(*)::TEXT AS "txCount"
        FROM payments
        WHERE status = 'SUCCEEDED' AND "paidAt" >= $1 AND "paidAt" <= $2
        GROUP BY currency
        ORDER BY currency
      `,
        [range.from, range.to],
      ),
      this.dataSource.query<{ day: string; currency: string; total: string }[]>(
        `
        SELECT
          DATE_TRUNC('day', "paidAt" AT TIME ZONE 'UTC')::DATE::TEXT AS day,
          currency,
          SUM(amount) AS total
        FROM payments
        WHERE status = 'SUCCEEDED' AND "paidAt" >= $1 AND "paidAt" <= $2
        GROUP BY 1, 2
        ORDER BY 1 ASC, 2 ASC
      `,
        [range.from, range.to],
      ),
    ]);

    return {
      period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      summary: summaryRows.map((r) => ({
        currency: r.currency,
        totalRevenue: Number(r.total),
        transactionCount: Number(r.txCount),
      })),
      trend: trendRows.map((r) => ({
        day: r.day,
        currency: r.currency,
        total: Number(r.total),
      })),
    };
  }

  // ============================================================
  // ADMIN: LEARNING ANALYTICS
  // Quiz performance + lesson completion across the platform.
  // ============================================================

  async getLearningAnalytics() {
    const [
      totalLessonProgress,
      completedLessonProgress,
      totalAttempts,
      passedAttempts,
    ] = await Promise.all([
      this.progressRepo.count(),
      this.progressRepo.count({ where: { status: LessonProgressStatus.COMPLETED } }),
      this.attemptRepo.count({ where: { status: QuizAttemptStatus.SUBMITTED } }),
      this.attemptRepo.count({ where: { status: QuizAttemptStatus.SUBMITTED, isPassed: true } }),
    ]);

    const scoreRow: {
      avg: string | null;
      failing?: string;
      average?: string;
      good?: string;
      excellent?: string;
    }[] = await this.dataSource.query(`
      SELECT
        AVG(percentage) AS avg,
        COUNT(*) FILTER (WHERE percentage >= 0 AND percentage < 50)::TEXT AS failing,
        COUNT(*) FILTER (WHERE percentage >= 50 AND percentage < 70)::TEXT AS average,
        COUNT(*) FILTER (WHERE percentage >= 70 AND percentage < 85)::TEXT AS good,
        COUNT(*) FILTER (WHERE percentage >= 85)::TEXT AS excellent
      FROM quiz_attempts
      WHERE status = 'SUBMITTED'
    `);

    const avgScore =
      scoreRow[0]?.avg !== null && scoreRow[0]?.avg !== undefined
        ? Math.round(Number(scoreRow[0].avg) * 100) / 100
        : null;

    return {
      lessonCompletion: {
        totalRecords: totalLessonProgress,
        completedRecords: completedLessonProgress,
        completionRatePercent:
          totalLessonProgress > 0
            ? Math.round((completedLessonProgress / totalLessonProgress) * 10000) / 100
            : 0,
      },
      quizzes: {
        totalAttempts,
        passedAttempts,
        passRatePercent:
          totalAttempts > 0
            ? Math.round((passedAttempts / totalAttempts) * 10000) / 100
            : 0,
        averageScorePercent: avgScore,
        scoreDistribution: {
          failing: Number(scoreRow[0]?.failing || 0),
          average: Number(scoreRow[0]?.average || 0),
          good: Number(scoreRow[0]?.good || 0),
          excellent: Number(scoreRow[0]?.excellent || 0),
        },
        note: 'Average score is computed across all submitted attempts platform-wide.',
      },
    };
  }

  // ============================================================
  // INSTRUCTOR: COURSE ANALYTICS
  // Scoped strictly to courses owned by the requesting instructor.
  // ============================================================

  async getInstructorAnalytics(instructorId: string) {
    // Only courses owned by this instructor
    const rows: {
      courseId: string;
      title: string;
      status: string;
      totalEnrollments: string;
      activeEnrollments: string;
      completedEnrollments: string;
      avgQuizScore: string | null;
      quizAttempts: string;
    }[] = await this.dataSource.query(
      `
      SELECT
        c.id AS "courseId",
        c.title,
        c.status,
        COUNT(DISTINCT e.id)::TEXT AS "totalEnrollments",
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE')::TEXT   AS "activeEnrollments",
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'COMPLETED')::TEXT AS "completedEnrollments",
        AVG(qa.percentage)::TEXT  AS "avgQuizScore",
        COUNT(DISTINCT qa.id)::TEXT AS "quizAttempts"
      FROM courses c
      LEFT JOIN enrollments  e  ON e."courseId"  = c.id
      LEFT JOIN quizzes      qz ON qz."courseId" = c.id
      LEFT JOIN quiz_attempts qa ON qa."quizId"  = qz.id
                                 AND qa.status    = 'SUBMITTED'
      WHERE c."instructorId" = $1
      GROUP BY c.id, c.title, c.status
      ORDER BY "totalEnrollments"::INT DESC
    `,
      [instructorId],
    );

    const courses = rows.map((r) => {
      const total = Number(r.totalEnrollments);
      const completed = Number(r.completedEnrollments);
      return {
        courseId: r.courseId,
        title: r.title,
        status: r.status,
        totalEnrollments: total,
        activeEnrollments: Number(r.activeEnrollments),
        completedEnrollments: completed,
        completionRatePercent:
          total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        quizAttempts: Number(r.quizAttempts),
        averageQuizScorePercent:
          r.avgQuizScore !== null && r.avgQuizScore !== undefined
            ? Math.round(Number(r.avgQuizScore) * 100) / 100
            : null,
      };
    });

    const totalEnrollments = courses.reduce((s, c) => s + c.totalEnrollments, 0);
    const completedEnrollments = courses.reduce((s, c) => s + c.completedEnrollments, 0);
    const activeEnrollments = courses.reduce((s, c) => s + c.activeEnrollments, 0);
    const totalQuizAttempts = courses.reduce((s, c) => s + c.quizAttempts, 0);
    const overallCompletionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
        : 0;

    return {
      summary: {
        totalCourses: courses.length,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRatePercent: overallCompletionRate,
        totalQuizAttempts,
      },
      data: courses,
    };
  }

  async getInstructorCourseDetail(instructorId: string, courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID "${courseId}" not found`);
    }
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('Access denied: You do not own this course');
    }

    const [enrollmentStats, lessonStats, quizStats] = await Promise.all([
      this.dataSource.query<{
        total: string;
        active: string;
        completed: string;
      }[]>(
        `
        SELECT
          COUNT(id)::TEXT AS total,
          COUNT(id) FILTER (WHERE status = 'ACTIVE')::TEXT AS active,
          COUNT(id) FILTER (WHERE status = 'COMPLETED')::TEXT AS completed
        FROM enrollments
        WHERE "courseId" = $1
      `,
        [courseId],
      ),
      this.dataSource.query<{
        totalLessons: string;
        completedProgress: string;
      }[]>(
        `
        SELECT
          (SELECT COUNT(l.id)::TEXT FROM lessons l JOIN sections s ON s.id = l."sectionId" WHERE s."courseId" = $1) AS "totalLessons",
          (SELECT COUNT(lp.id)::TEXT FROM lesson_progress lp JOIN lessons l ON l.id = lp."lessonId" JOIN sections s ON s.id = l."sectionId" WHERE s."courseId" = $1 AND lp.status = 'COMPLETED') AS "completedProgress"
      `,
        [courseId],
      ),
      this.dataSource.query<{
        totalQuizzes: string;
        totalAttempts: string;
        passedAttempts: string;
        avgScore: string | null;
        failing: string;
        average: string;
        good: string;
        excellent: string;
      }[]>(
        `
        SELECT
          COUNT(DISTINCT q.id)::TEXT AS "totalQuizzes",
          COUNT(qa.id)::TEXT AS "totalAttempts",
          COUNT(qa.id) FILTER (WHERE qa."isPassed" = true)::TEXT AS "passedAttempts",
          AVG(qa.percentage)::TEXT AS "avgScore",
          COUNT(qa.id) FILTER (WHERE qa.percentage >= 0 AND qa.percentage < 50)::TEXT AS failing,
          COUNT(qa.id) FILTER (WHERE qa.percentage >= 50 AND qa.percentage < 70)::TEXT AS average,
          COUNT(qa.id) FILTER (WHERE qa.percentage >= 70 AND qa.percentage < 85)::TEXT AS good,
          COUNT(qa.id) FILTER (WHERE qa.percentage >= 85)::TEXT AS excellent
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON qa."quizId" = q.id AND qa.status = 'SUBMITTED'
        WHERE q."courseId" = $1
      `,
        [courseId],
      ),
    ]);

    const totalEnr = Number(enrollmentStats[0]?.total || 0);
    const compEnr = Number(enrollmentStats[0]?.completed || 0);
    const totalLes = Number(lessonStats[0]?.totalLessons || 0);
    const compLes = Number(lessonStats[0]?.completedProgress || 0);
    const totalAtt = Number(quizStats[0]?.totalAttempts || 0);
    const passAtt = Number(quizStats[0]?.passedAttempts || 0);

    return {
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        price: course.price,
        currency: course.currency,
        createdAt: course.createdAt,
      },
      enrollments: {
        total: totalEnr,
        active: Number(enrollmentStats[0]?.active || 0),
        completed: compEnr,
        completionRatePercent: totalEnr > 0 ? Math.round((compEnr / totalEnr) * 10000) / 100 : 0,
      },
      lessons: {
        totalLessons: totalLes,
        completedProgressRecords: compLes,
        completionRatePercent:
          totalEnr > 0 && totalLes > 0
            ? Math.round((compLes / (totalEnr * totalLes)) * 10000) / 100
            : 0,
      },
      quizzes: {
        totalQuizzes: Number(quizStats[0]?.totalQuizzes || 0),
        totalAttempts: totalAtt,
        passedAttempts: passAtt,
        passRatePercent: totalAtt > 0 ? Math.round((passAtt / totalAtt) * 10000) / 100 : 0,
        averageScorePercent:
          quizStats[0]?.avgScore !== null && quizStats[0]?.avgScore !== undefined
            ? Math.round(Number(quizStats[0].avgScore) * 100) / 100
            : null,
        scoreDistribution: {
          failing: Number(quizStats[0]?.failing || 0),
          average: Number(quizStats[0]?.average || 0),
          good: Number(quizStats[0]?.good || 0),
          excellent: Number(quizStats[0]?.excellent || 0),
        },
      },
    };
  }

  // ============================================================
  // STUDENT: LEARNING SUMMARY
  // Scoped strictly to the authenticated student.
  // ============================================================

  async getStudentLearningSummary(studentId: string) {
    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalCertificates,
      totalAttempts,
      passedAttempts,
      completedLessons,
      enrolledCourses,
      recentAttempts,
      certificatesList,
    ] = await Promise.all([
      this.enrollmentRepo.count({ where: { studentId } }),
      this.enrollmentRepo.count({ where: { studentId, status: EnrollmentStatus.ACTIVE } }),
      this.enrollmentRepo.count({ where: { studentId, status: EnrollmentStatus.COMPLETED } }),
      this.certRepo.count({ where: { studentId } }),
      this.attemptRepo.count({ where: { studentId, status: QuizAttemptStatus.SUBMITTED } }),
      this.attemptRepo.count({ where: { studentId, status: QuizAttemptStatus.SUBMITTED, isPassed: true } }),
      this.progressRepo.count({ where: { studentId, status: LessonProgressStatus.COMPLETED } }),
      this.enrollmentRepo.find({
        where: { studentId },
        relations: { course: true },
        order: { createdAt: 'DESC' },
      }),
      this.attemptRepo.find({
        where: { studentId, status: QuizAttemptStatus.SUBMITTED },
        relations: { quiz: true },
        order: { submittedAt: 'DESC' },
        take: 10,
      }),
      this.certRepo.find({
        where: { studentId },
        relations: { course: true },
        order: { issuedAt: 'DESC' },
      }),
    ]);

    const avgScoreRow: { avg: string | null }[] = await this.dataSource.query(
      `SELECT AVG(percentage) AS avg FROM quiz_attempts WHERE "studentId" = $1 AND status = 'SUBMITTED'`,
      [studentId],
    );
    const avgScore =
      avgScoreRow[0]?.avg !== null && avgScoreRow[0]?.avg !== undefined
        ? Math.round(Number(avgScoreRow[0].avg) * 100) / 100
        : null;

    // Recent lesson activity (last 30 days)
    const recentActivity: { day: string; lessonsCompleted: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_TRUNC('day', "completedAt" AT TIME ZONE 'UTC')::DATE::TEXT AS day,
          COUNT(*)::TEXT AS "lessonsCompleted"
        FROM lesson_progress
        WHERE "studentId" = $1
          AND status = 'COMPLETED'
          AND "completedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        [studentId],
      );

    return {
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRatePercent:
          totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
            : 0,
      },
      lessons: {
        completedTotal: completedLessons,
      },
      quizzes: {
        totalAttempts,
        passedAttempts,
        passRatePercent:
          totalAttempts > 0
            ? Math.round((passedAttempts / totalAttempts) * 10000) / 100
            : 0,
        averageScorePercent: avgScore,
      },
      certificates: {
        total: totalCertificates,
        items: (certificatesList || []).map((c) => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          courseTitle: c.course?.title || 'Course',
          issuedAt: c.issuedAt,
          status: c.status,
        })),
      },
      courses: (enrolledCourses || []).map((e: any) => ({
        enrollmentId: e.id,
        courseId: e.courseId,
        title: e.course?.title || 'Course',
        slug: e.course?.slug || '',
        status: e.status,
        progressPercentage:
          e.progressPercentage !== undefined
            ? e.progressPercentage
            : e.status === EnrollmentStatus.COMPLETED
            ? 100
            : 0,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
      })),
      recentQuizzes: (recentAttempts || []).map((a) => ({
        attemptId: a.id,
        quizTitle: a.quiz?.title || 'Quiz',
        percentage: a.percentage,
        isPassed: a.isPassed,
        score: a.score,
        maxScore: a.maxScore,
        submittedAt: a.submittedAt,
      })),
      recentActivity: recentActivity.map((r) => ({
        day: r.day,
        lessonsCompleted: Number(r.lessonsCompleted),
      })),
    };
  }

  // ============================================================
  // CSV EXPORTS
  // ============================================================

  async exportEnrollmentsCsv(): Promise<string> {
    const rows: {
      id: string;
      studentEmail: string;
      courseTitle: string;
      status: string;
      enrolledAt: Date | null;
      completedAt: Date | null;
      createdAt: Date;
    }[] = await this.dataSource.query(`
      SELECT
        e.id,
        u.email       AS "studentEmail",
        c.title       AS "courseTitle",
        e.status,
        e."enrolledAt",
        e."completedAt",
        e."createdAt"
      FROM enrollments e
      JOIN users   u ON u.id = e."studentId"
      JOIN courses c ON c.id = e."courseId"
      ORDER BY e."createdAt" DESC
      LIMIT 5000
    `);

    return buildCsvString(
      [
        { label: 'Enrollment ID', key: 'id' },
        { label: 'Student Email', key: 'studentEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Status', key: 'status' },
        { label: 'Enrolled At (UTC)', key: 'enrolledAt' },
        { label: 'Completed At (UTC)', key: 'completedAt' },
        { label: 'Created At (UTC)', key: 'createdAt' },
      ],
      rows as any[],
    );
  }

  async exportPaymentsCsv(): Promise<string> {
    const rows: {
      id: string;
      studentEmail: string;
      courseTitle: string;
      amount: number;
      currency: string;
      status: string;
      paidAt: Date | null;
      createdAt: Date;
    }[] = await this.dataSource.query(`
      SELECT
        p.id,
        u.email  AS "studentEmail",
        c.title  AS "courseTitle",
        p.amount,
        p.currency,
        p.status,
        p."paidAt",
        p."createdAt"
      FROM payments p
      LEFT JOIN users   u ON u.id = p."studentId"
      LEFT JOIN courses c ON c.id = p."courseId"
      WHERE p.status = 'SUCCEEDED'
      ORDER BY p."paidAt" DESC
      LIMIT 5000
    `);

    return buildCsvString(
      [
        { label: 'Payment ID', key: 'id' },
        { label: 'Student Email', key: 'studentEmail' },
        { label: 'Course Title', key: 'courseTitle' },
        { label: 'Amount', key: 'amount' },
        { label: 'Currency', key: 'currency' },
        { label: 'Status', key: 'status' },
        { label: 'Paid At (UTC)', key: 'paidAt' },
        { label: 'Created At (UTC)', key: 'createdAt' },
      ],
      rows as any[],
    );
  }

  async exportCoursePerformanceCsv(instructorId?: string): Promise<string> {
    const params: unknown[] = [];
    let whereClause = '';
    if (instructorId) {
      params.push(instructorId);
      whereClause = `WHERE c."instructorId" = $1`;
    }

    const rows: {
      courseId: string;
      title: string;
      status: string;
      totalEnrollments: string;
      completedEnrollments: string;
    }[] = await this.dataSource.query(
      `
      SELECT
        c.id AS "courseId",
        c.title,
        c.status,
        COUNT(e.id)::TEXT AS "totalEnrollments",
        COUNT(e.id) FILTER (WHERE e.status = 'COMPLETED')::TEXT AS "completedEnrollments"
      FROM courses c
      LEFT JOIN enrollments e ON e."courseId" = c.id
      ${whereClause}
      GROUP BY c.id, c.title, c.status
      ORDER BY "totalEnrollments"::INT DESC
      LIMIT 5000
    `,
      params,
    );

    return buildCsvString(
      [
        { label: 'Course ID', key: 'courseId' },
        { label: 'Title', key: 'title' },
        { label: 'Status', key: 'status' },
        { label: 'Total Enrollments', key: 'totalEnrollments' },
        { label: 'Completed Enrollments', key: 'completedEnrollments' },
      ],
      rows as any[],
    );
  }
}
