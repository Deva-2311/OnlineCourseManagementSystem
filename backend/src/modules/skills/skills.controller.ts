import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Skills & Topic Taxonomy')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new skill or topic (Instructor/Admin)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Skill created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Skill already exists' })
  async createSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createSkill(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all skills (Public)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of skills' })
  async findAll(@Query('categoryId') categoryId?: string) {
    return this.skillsService.findAll(categoryId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve skill details by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Skill details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Skill not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.findById(id);
  }

  @Put('questions/:questionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Map skill to a quiz question (Instructor/Admin)' })
  async mapQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body('skillId') skillId?: string,
  ) {
    return this.skillsService.mapSkillToQuestion(questionId, skillId || null);
  }

  @Put('lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Map skills to a lesson (Instructor/Admin)' })
  async mapLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body('skillIds') skillIds: string[],
  ) {
    return this.skillsService.mapSkillsToLesson(lessonId, skillIds || []);
  }

  @Put('courses/:courseId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Map skills to a course (Instructor/Admin)' })
  async mapCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body('skillIds') skillIds: string[],
  ) {
    return this.skillsService.mapSkillsToCourse(courseId, skillIds || []);
  }
}
