import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../../common/utils/slugify.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const trimmedName = createCategoryDto.name.trim();
    const slug = slugify(trimmedName);

    const existing = await this.categoryRepository.findOne({
      where: [{ name: trimmedName }, { slug }],
    });
    if (existing) {
      throw new ConflictException('A category with this name or slug already exists');
    }

    const category = this.categoryRepository.create({
      name: trimmedName,
      slug,
      description: createCategoryDto.description?.trim(),
    });

    return this.categoryRepository.save(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);

    if (updateCategoryDto.name) {
      const trimmedName = updateCategoryDto.name.trim();
      const slug = slugify(trimmedName);

      const conflict = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.id != :id', { id })
        .andWhere('(category.name = :name OR category.slug = :slug)', {
          name: trimmedName,
          slug,
        })
        .getOne();

      if (conflict) {
        throw new ConflictException('A category with this name or slug already exists');
      }

      category.name = trimmedName;
      category.slug = slug;
    }

    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description?.trim();
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findById(id);

    // Verify no courses reference this category to prevent silent data corruption
    const referencedCoursesCount = await this.courseRepository.count({
      where: { categoryId: category.id },
    });

    if (referencedCoursesCount > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it is currently referenced by ${referencedCoursesCount} course(s). Reassign or remove the courses first.`,
      );
    }

    await this.categoryRepository.remove(category);
    return { message: `Category "${category.name}" successfully deleted` };
  }
}
