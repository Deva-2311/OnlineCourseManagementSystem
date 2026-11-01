/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { Course } from '../courses/entities/course.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepo: any;
  let courseRepo: any;

  const mockCategory: Category = {
    id: 'cat-uuid-1',
    name: 'Web Development',
    slug: 'web-development',
    description: 'Learn web technologies',
    courses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    categoryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    courseRepo = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should find all categories ordered by name', async () => {
    categoryRepo.find.mockResolvedValue([mockCategory]);

    const result = await service.findAll();
    expect(result).toEqual([mockCategory]);
    expect(categoryRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it('should find category by ID or throw NotFoundException', async () => {
    categoryRepo.findOne.mockResolvedValue(mockCategory);

    const result = await service.findById(mockCategory.id);
    expect(result).toBe(mockCategory);

    categoryRepo.findOne.mockResolvedValue(null);
    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create category and generate clean slug', async () => {
    categoryRepo.findOne.mockResolvedValue(null);
    categoryRepo.create.mockImplementation((data: any) => ({ ...mockCategory, ...data }));
    categoryRepo.save.mockImplementation(async (cat: any) => cat);

    const result = await service.create({
      name: 'Mobile App Development',
      description: 'iOS and Android',
    });

    expect(result.name).toBe('Mobile App Development');
    expect(result.slug).toBe('mobile-app-development');
  });

  it('should prevent creating duplicate category name or slug with ConflictException', async () => {
    categoryRepo.findOne.mockResolvedValue(mockCategory);

    await expect(
      service.create({ name: 'Web Development' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should delete category when no courses reference it', async () => {
    categoryRepo.findOne.mockResolvedValue(mockCategory);
    courseRepo.count.mockResolvedValue(0); // 0 referenced courses
    categoryRepo.remove.mockResolvedValue(mockCategory);

    const result = await service.remove(mockCategory.id);
    expect(result.message).toContain('deleted');
    expect(categoryRepo.remove).toHaveBeenCalledWith(mockCategory);
  });

  it('should reject category deletion with ConflictException if courses still reference it', async () => {
    categoryRepo.findOne.mockResolvedValue(mockCategory);
    courseRepo.count.mockResolvedValue(3); // 3 referenced courses

    await expect(service.remove(mockCategory.id)).rejects.toThrow(ConflictException);
    expect(categoryRepo.remove).not.toHaveBeenCalled();
  });
});
