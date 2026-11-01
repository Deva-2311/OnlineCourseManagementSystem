import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

@ApiTags('RBAC Test (Development/Testing Only)')
@Controller('test-rbac')
export class RbacTestController {
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Test public route (No auth required)' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Public access granted' } } })
  publicRoute() {
    return { message: 'Public access granted' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @Get('student')
  @ApiOperation({ summary: 'Test student-only route' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Student access granted' } } })
  @ApiResponse({ status: 403, description: 'Forbidden for non-students' })
  studentRoute(@CurrentUser() user: User) {
    return {
      message: 'Student access granted',
      user: user.toSafeUser(),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @Get('instructor')
  @ApiOperation({ summary: 'Test instructor-only route' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Instructor access granted' } } })
  @ApiResponse({ status: 403, description: 'Forbidden for non-instructors' })
  instructorRoute(@CurrentUser() user: User) {
    return {
      message: 'Instructor access granted',
      user: user.toSafeUser(),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'Test admin-only route' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Admin access granted' } } })
  @ApiResponse({ status: 403, description: 'Forbidden for non-admins' })
  adminRoute(@CurrentUser() user: User) {
    return {
      message: 'Admin access granted',
      user: user.toSafeUser(),
    };
  }
}
