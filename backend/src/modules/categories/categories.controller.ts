import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../auth/decorators/public.decorator';
import { Category } from './entities/category.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Retrieve all course categories for public discovery',
    description: 'Returns all available categories sorted alphabetically.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all categories',
    type: [Category],
  })
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }
}
