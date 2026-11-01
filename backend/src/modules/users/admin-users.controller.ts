import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { User } from './entities/user.entity';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List and search users with pagination (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated user list' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    return this.usersService.findAllAdmin({ page, limit, search, role, status });
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get user impact summary including course/enrollment/payment counts (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User summary with impact statistics' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getUserSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserSummary(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user account status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User status updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Self-suspension not permitted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Primary administrator cannot be suspended' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.updateStatus(id, status, admin, { ipAddress, userAgent });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account with safe retention handling (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User deleted or safely deactivated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Self-deletion not permitted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Primary administrator cannot be deleted' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.deleteUser(id, admin, { ipAddress, userAgent });
  }
}
