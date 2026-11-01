import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { QuizQuestion } from '../quizzes/entities/quiz-question.entity';
import { Lesson } from '../curriculum/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async createSkill(dto: CreateSkillDto): Promise<Skill> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.skillRepository.findOne({
      where: [{ name: dto.name.trim() }, { slug }],
    });

    if (existing) {
      throw new ConflictException(`Skill with name "${dto.name}" already exists`);
    }

    const skill = this.skillRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim(),
      categoryId: dto.categoryId,
    });

    return this.skillRepository.save(skill);
  }

  async findAll(categoryId?: string): Promise<Skill[]> {
    const qb = this.skillRepository
      .createQueryBuilder('skill')
      .leftJoinAndSelect('skill.category', 'category')
      .orderBy('skill.name', 'ASC');

    if (categoryId) {
      qb.where('skill.categoryId = :categoryId', { categoryId });
    }

    return qb.getMany();
  }

  async findById(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!skill) {
      throw new NotFoundException(`Skill [${id}] not found`);
    }

    return skill;
  }

  async mapSkillToQuestion(questionId: string, skillId: string | null): Promise<QuizQuestion> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException(`Quiz question [${questionId}] not found`);
    }

    if (skillId) {
      const skill = await this.skillRepository.findOne({ where: { id: skillId } });
      if (!skill) {
        throw new NotFoundException(`Skill [${skillId}] not found`);
      }
      question.skillId = skill.id;
      question.topic = skill.name;
    } else {
      question.skillId = null;
    }

    return this.questionRepository.save(question);
  }

  async mapSkillsToLesson(lessonId: string, skillIds: string[]): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: { skills: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const skills = skillIds.length > 0
      ? await this.skillRepository.find({ where: { id: In(skillIds) } })
      : [];

    lesson.skills = skills;
    return this.lessonRepository.save(lesson);
  }

  async mapSkillsToCourse(courseId: string, skillIds: string[]): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { skills: true },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    const skills = skillIds.length > 0
      ? await this.skillRepository.find({ where: { id: In(skillIds) } })
      : [];

    course.skills = skills;
    return this.courseRepository.save(course);
  }
}
