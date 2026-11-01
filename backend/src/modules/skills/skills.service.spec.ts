import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { Skill } from './entities/skill.entity';
import { QuizQuestion } from '../quizzes/entities/quiz-question.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';

describe('SkillsService', () => {
  let service: SkillsService;
  let skillRepository: any;
  let questionRepository: any;
  let lessonRepository: any;
  let courseRepository: any;

  beforeEach(async () => {
    skillRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'skill-uuid-1', ...entity })),
      createQueryBuilder: jest.fn(),
    };
    questionRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    lessonRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    courseRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        {
          provide: getRepositoryToken(Skill),
          useValue: skillRepository,
        },
        {
          provide: getRepositoryToken(QuizQuestion),
          useValue: questionRepository,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: lessonRepository,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  describe('createSkill', () => {
    it('should create a skill successfully with a slug', async () => {
      skillRepository.findOne.mockResolvedValue(null);

      const result = await service.createSkill({
        name: 'Database Indexing',
        description: 'B-Trees and hash indices',
      });

      expect(result.name).toBe('Database Indexing');
      expect(result.slug).toBe('database-indexing');
      expect(skillRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if skill name or slug already exists', async () => {
      skillRepository.findOne.mockResolvedValue({ id: 'existing-id', name: 'Database Indexing' });

      await expect(
        service.createSkill({
          name: 'Database Indexing',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('mapSkillToQuestion', () => {
    it('should link a skill to a quiz question', async () => {
      const mockQuestion = { id: 'q-1', skillId: null, topic: null };
      const mockSkill = { id: 'skill-1', name: 'Recursion' };

      questionRepository.findOne.mockResolvedValue(mockQuestion);
      skillRepository.findOne.mockResolvedValue(mockSkill);

      const result = await service.mapSkillToQuestion('q-1', 'skill-1');

      expect(result.skillId).toBe('skill-1');
      expect(result.topic).toBe('Recursion');
      expect(questionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if question does not exist', async () => {
      questionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.mapSkillToQuestion('q-invalid', 'skill-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapSkillsToLesson', () => {
    it('should map multiple skills to a lesson', async () => {
      const mockLesson = { id: 'les-1', skills: [] };
      const mockSkills = [
        { id: 'sk-1', name: 'SQL' },
        { id: 'sk-2', name: 'NoSQL' },
      ];

      lessonRepository.findOne.mockResolvedValue(mockLesson);
      skillRepository.find.mockResolvedValue(mockSkills);

      const result = await service.mapSkillsToLesson('les-1', ['sk-1', 'sk-2']);

      expect(result.skills).toEqual(mockSkills);
      expect(lessonRepository.save).toHaveBeenCalled();
    });
  });
});
