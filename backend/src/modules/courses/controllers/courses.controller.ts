import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CoursesService } from '../courses.service';
import { CourseQueryDto } from '../dto/course-query.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Courses (Public Discovery)')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Search and browse published courses',
    description:
      'Returns a paginated list of published courses supporting text search, category filtering, difficulty level, price range, and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated published courses catalogue',
  })
  async findPublishedCourses(@Query() query: CourseQueryDto) {
    return this.coursesService.findPublishedCourses(query);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({
    summary: 'Retrieve single published course by UUID or slug',
    description:
      'Fetches published course details without leaking internal moderation notes or unpublished drafts.',
  })
  @ApiParam({
    name: 'idOrSlug',
    description: 'Course UUID or URL slug',
    example: 'full-stack-web-development-with-react-nestjs',
  })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found or not published' })
  async findPublishedCourseByIdOrSlug(@Param('idOrSlug') idOrSlug: string) {
    return this.coursesService.findPublishedCourseByIdOrSlug(idOrSlug);
  }
}
