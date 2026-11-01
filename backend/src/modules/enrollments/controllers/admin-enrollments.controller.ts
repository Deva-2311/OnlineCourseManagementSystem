import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EnrollmentsService } from '../enrollments.service';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Admin Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/enrollments')
export class AdminEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all enrollments across all courses (Admin only)',
    description: 'Paginated enrollment audit record view.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: EnrollmentStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated enrollment list',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.findAllAdminEnrollments(page, limit, status);
  }
}
