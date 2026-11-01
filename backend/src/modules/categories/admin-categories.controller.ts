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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Category } from './entities/category.entity';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: Category })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category name or slug already exists' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all categories for administration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: [Category] })
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing category (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: Category })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Updated name or slug conflicts' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category if not in use by courses (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category deleted' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category is referenced by existing courses' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
