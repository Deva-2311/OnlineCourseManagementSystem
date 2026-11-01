import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { CoursesService } from '../courses.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { Course } from '../entities/course.entity';

@ApiTags('Instructor Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@Controller('instructor/courses')
export class InstructorCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft course (Instructor only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: Course })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  async createDraft(
    @CurrentUser() user: User,
    @Body() createCourseDto: CreateCourseDto,
  ): Promise<Course> {
    return this.coursesService.createDraft(user.id, createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all courses authored by the authenticated instructor' })
  @ApiResponse({ status: HttpStatus.OK, type: [Course] })
  async findMyCourses(@CurrentUser() user: User): Promise<Course[]> {
    return this.coursesService.findInstructorCourses(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve course details by ID for the owning instructor' })
  @ApiResponse({ status: HttpStatus.OK, type: Course })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not own this course' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Course> {
    return this.coursesService.findInstructorCourseById(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update course details',
    description:
      'Updates course fields. If a published course is edited, it returns to PENDING_REVIEW status to require moderation approval before updates go live.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Course })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot update while pending review' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not own this course' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    return this.coursesService.updateInstructorCourse(user.id, id, updateCourseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete draft or rejected course',
    description: 'Destructive deletion allowed only for DRAFT or REJECTED courses.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course deleted' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete published or pending course' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not own this course' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coursesService.deleteInstructorCourse(user.id, id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit draft course for administrative review',
    description:
      'Validates completeness (title, description, category, learning outcomes) and moves status from DRAFT/REJECTED to PENDING_REVIEW.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Course })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Incomplete content or invalid state transition' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not own this course' })
  async submitForReview(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Course> {
    return this.coursesService.submitForReview(user.id, id);
  }
}
