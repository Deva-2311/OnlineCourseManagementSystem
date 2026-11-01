import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AnalyticsService, DatePeriod } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

// ─── Validation helper ────────────────────────────────────────
const VALID_PERIODS: DatePeriod[] = ['7d', '30d', '90d', 'custom'];
function sanitizePeriod(raw: string | undefined): DatePeriod {
  if (raw && VALID_PERIODS.includes(raw as DatePeriod)) return raw as DatePeriod;
  return '30d';
}

// ─── Admin Analytics ─────────────────────────────────────────

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide overview metrics (Admin only)' })
  async getOverview() {
    return this.analyticsService.getAdminOverview();
  }

  @Get('enrollments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrollment trends over time (Admin only)' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d', 'custom'], required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date (custom period only)' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date (custom period only)' })
  async getEnrollments(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getEnrollmentTrends(sanitizePeriod(period), from, to);
  }

  @Get('users/growth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User registration growth over time (Admin only)' })
  async getUserGrowth(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getUserGrowthTrends(sanitizePeriod(period), from, to);
  }

  @Get('courses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Course enrollment and completion analytics (Admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max courses to return (default 20, max 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by title' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by course status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['enrollments', 'completionRate', 'title', 'createdAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async getCourses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.analyticsService.getCourseAnalytics({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment revenue analytics (Admin only, SUCCEEDED only)' })
  async getPayments(
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPaymentAnalytics(sanitizePeriod(period), from, to);
  }

  @Get('learning')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform-wide learning analytics (Admin only)' })
  async getLearning() {
    return this.analyticsService.getLearningAnalytics();
  }

  // CSV Exports

  @Get('export/enrollments')
  @ApiOperation({ summary: 'Export all enrollments as CSV (Admin only, max 5000 rows)' })
  async exportEnrollmentsCsv(@Res() res: Response) {
    const csv = await this.analyticsService.exportEnrollmentsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ocms-enrollments-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('\uFEFF' + csv);
  }

  @Get('export/payments')
  @ApiOperation({ summary: 'Export successful payments as CSV (Admin only, max 5000 rows)' })
  async exportPaymentsCsv(@Res() res: Response) {
    const csv = await this.analyticsService.exportPaymentsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ocms-payments-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('\uFEFF' + csv);
  }

  @Get('export/courses')
  @ApiOperation({ summary: 'Export course performance as CSV (Admin only, max 5000 rows)' })
  async exportCoursesCsv(@Res() res: Response) {
    const csv = await this.analyticsService.exportCoursePerformanceCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ocms-courses-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('\uFEFF' + csv);
  }
}

// ─── Instructor Analytics ─────────────────────────────────────

@ApiTags('Instructor Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@Controller('instructor/analytics')
export class InstructorAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analytics for courses owned by the authenticated instructor' })
  async getMyAnalytics(@CurrentUser() user: User) {
    return this.analyticsService.getInstructorAnalytics(user.id);
  }

  @Get('courses/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detailed analytics for a specific owned course' })
  async getCourseDetail(
    @CurrentUser() user: User,
    @Param('courseId') courseId: string,
  ) {
    return this.analyticsService.getInstructorCourseDetail(user.id, courseId);
  }

  @Get('export/courses')
  @ApiOperation({ summary: 'Export own course performance as CSV' })
  async exportCsv(@CurrentUser() user: User, @Res() res: Response) {
    const csv = await this.analyticsService.exportCoursePerformanceCsv(user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="my-courses-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('\uFEFF' + csv);
  }
}

// ─── Student Learning Summary ─────────────────────────────────

@ApiTags('Student Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student/learning-summary')
export class StudentAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticated student learning summary' })
  async getMyLearningSummary(@CurrentUser() user: User) {
    return this.analyticsService.getStudentLearningSummary(user.id);
  }
}
