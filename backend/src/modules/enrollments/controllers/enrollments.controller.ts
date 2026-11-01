import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EnrollmentsService } from '../enrollments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import {
  EnrollmentActionResponseDto,
  SafeEnrollmentDto,
} from '../dto/enrollment-response.dto';
import { EnrollmentStatusDto } from '../dto/enrollment-status.dto';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Roles(UserRole.STUDENT)
  @Post('courses/:courseId/enroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enroll in a course (Student only)',
    description:
      'Enrolls authenticated student in a published course. Free courses receive immediate ACTIVE status. Paid courses receive PENDING_PAYMENT status awaiting Phase 10 Stripe checkout.',
  })
  @ApiParam({ name: 'courseId', description: 'Course UUID to enroll in' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment initiated or completed successfully',
    type: EnrollmentActionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Course not published or unmet prerequisites' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already actively enrolled or completed' })
  async enroll(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<EnrollmentActionResponseDto> {
    return this.enrollmentsService.enroll(user.id, courseId, user.fullName, user.email);
  }

  @Roles(UserRole.STUDENT)
  @Get('courses/:courseId/enrollment-status')
  @ApiOperation({
    summary: 'Check enrollment status for a course (Student only)',
    description: 'Returns private enrollment state for the authenticated student.',
  })
  @ApiParam({ name: 'courseId', description: 'Course UUID to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current student enrollment status',
    type: EnrollmentStatusDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async getEnrollmentStatus(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<EnrollmentStatusDto> {
    return this.enrollmentsService.getEnrollmentStatus(user.id, courseId);
  }

  @Roles(UserRole.STUDENT)
  @Get('enrollments/me')
  @ApiOperation({
    summary: 'List all enrollments for the current student',
    description: 'Returns all courses enrolled by the authenticated student.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of student enrollments',
    type: [SafeEnrollmentDto],
  })
  async findMyEnrollments(@CurrentUser() user: User): Promise<SafeEnrollmentDto[]> {
    return this.enrollmentsService.findMyEnrollments(user.id);
  }

  @Get('enrollments/:enrollmentId')
  @ApiOperation({
    summary: 'Get details of a specific enrollment',
    description: 'Accessible by the owning student or an administrator.',
  })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment record UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Safe enrollment record details',
    type: SafeEnrollmentDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied: not your enrollment' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Enrollment record not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<SafeEnrollmentDto> {
    return this.enrollmentsService.findEnrollmentById(user.id, user.role, enrollmentId);
  }
}
