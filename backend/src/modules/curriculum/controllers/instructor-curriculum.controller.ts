import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurriculumService } from '../curriculum.service';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { SafeSectionDto, SafeLessonDto } from '../dto/curriculum-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@ApiTags('Instructor Curriculum')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiBearerAuth()
export class InstructorCurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  // ==========================================
  // SECTION ENDPOINTS
  // ==========================================

  @Post('courses/:courseId/sections')
  @ApiOperation({ summary: 'Create curriculum section for owned course (Instructor)' })
  @ApiResponse({ status: 201, description: 'Section created', type: SafeSectionDto })
  @ApiResponse({ status: 403, description: 'Access denied: You do not own this course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async createSection(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<SafeSectionDto> {
    return this.curriculumService.createSection(user.id, courseId, dto);
  }

  @Get('courses/:courseId/sections')
  @ApiOperation({ summary: 'List curriculum sections for owned course (Instructor)' })
  @ApiResponse({ status: 200, description: 'List of sections', type: [SafeSectionDto] })
  async findCourseSections(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<SafeSectionDto[]> {
    return this.curriculumService.findCourseSectionsForInstructor(user.id, courseId);
  }

  @Patch('sections/:sectionId')
  @ApiOperation({ summary: 'Update curriculum section (Instructor)' })
  @ApiResponse({ status: 200, description: 'Section updated', type: SafeSectionDto })
  async updateSection(
    @CurrentUser() user: User,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<SafeSectionDto> {
    return this.curriculumService.updateSection(user.id, sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @ApiOperation({ summary: 'Delete curriculum section (Instructor)' })
  @ApiResponse({ status: 200, description: 'Section deleted' })
  async deleteSection(
    @CurrentUser() user: User,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<{ message: string }> {
    return this.curriculumService.deleteSection(user.id, sectionId);
  }

  // ==========================================
  // LESSON ENDPOINTS
  // ==========================================

  @Post('sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Create lesson in curriculum section (Instructor)' })
  @ApiResponse({ status: 201, description: 'Lesson created', type: SafeLessonDto })
  async createLesson(
    @CurrentUser() user: User,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<SafeLessonDto> {
    return this.curriculumService.createLesson(user.id, sectionId, dto);
  }

  @Get('sections/:sectionId/lessons')
  @ApiOperation({ summary: 'List lessons in curriculum section (Instructor)' })
  @ApiResponse({ status: 200, description: 'List of lessons', type: [SafeLessonDto] })
  async findSectionLessons(
    @CurrentUser() user: User,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<SafeLessonDto[]> {
    return this.curriculumService.findSectionLessonsForInstructor(user.id, sectionId);
  }

  @Patch('lessons/:lessonId')
  @ApiOperation({ summary: 'Update lesson (Instructor)' })
  @ApiResponse({ status: 200, description: 'Lesson updated', type: SafeLessonDto })
  async updateLesson(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<SafeLessonDto> {
    return this.curriculumService.updateLesson(user.id, lessonId, dto);
  }

  @Delete('lessons/:lessonId')
  @ApiOperation({ summary: 'Delete lesson (Instructor)' })
  @ApiResponse({ status: 200, description: 'Lesson deleted' })
  async deleteLesson(
    @CurrentUser() user: User,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<{ message: string }> {
    return this.curriculumService.deleteLesson(user.id, lessonId);
  }
}
