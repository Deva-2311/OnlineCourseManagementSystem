import * as dotenv from 'dotenv';
import * as path from 'path';
import * as argon2 from 'argon2';
import { AppDataSource } from '../database/data-source';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/enums/user-role.enum';
import { UserStatus } from '../modules/users/enums/user-status.enum';
import { Category } from '../modules/categories/entities/category.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { CourseStatus } from '../modules/courses/enums/course-status.enum';
import { DifficultyLevel } from '../modules/courses/enums/difficulty-level.enum';
import { CourseSection } from '../modules/curriculum/entities/course-section.entity';
import { Lesson } from '../modules/curriculum/entities/lesson.entity';
import { LessonContentType } from '../modules/curriculum/enums/lesson-content-type.enum';
import { Quiz } from '../modules/quizzes/entities/quiz.entity';
import { QuizQuestion } from '../modules/quizzes/entities/quiz-question.entity';
import { QuestionOption } from '../modules/quizzes/entities/question-option.entity';
import { QuestionType } from '../modules/quizzes/enums/question-type.enum';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedDemo() {
  console.log('Connecting to database to verify demo accounts and curriculum...');
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);
  const courseRepo = AppDataSource.getRepository(Course);
  const sectionRepo = AppDataSource.getRepository(CourseSection);
  const lessonRepo = AppDataSource.getRepository(Lesson);
  const quizRepo = AppDataSource.getRepository(Quiz);
  const questionRepo = AppDataSource.getRepository(QuizQuestion);
  const optionRepo = AppDataSource.getRepository(QuestionOption);

  // 1. Provision Demo Instructor
  let instructor = await userRepo.findOne({ where: { email: 'instructor@ocms.com' } });
  if (!instructor) {
    console.log('Creating demo instructor [instructor@ocms.com]...');
    const hash = await argon2.hash('InstructorSecurePass123!');
    instructor = userRepo.create({
      fullName: 'Prof. Alan Turing',
      email: 'instructor@ocms.com',
      passwordHash: hash,
      role: UserRole.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await userRepo.save(instructor);
    console.log('Instructor created successfully.');
  } else {
    console.log('Demo instructor already exists.');
  }

  // 2. Provision Demo Student
  let student = await userRepo.findOne({ where: { email: 'student@ocms.com' } });
  if (!student) {
    console.log('Creating demo student [student@ocms.com]...');
    const hash = await argon2.hash('StudentSecurePass123!');
    student = userRepo.create({
      fullName: 'Jane Student',
      email: 'student@ocms.com',
      passwordHash: hash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await userRepo.save(student);
    console.log('Student created successfully.');
  } else {
    console.log('Demo student already exists.');
  }

  // 3. Find or Create Demo Category
  let category = await categoryRepo.findOne({ where: { slug: 'computer-science-demo' } });
  if (!category) {
    category = categoryRepo.create({
      name: 'Computer Science & Engineering',
      slug: 'computer-science-demo',
      description: 'Foundational computer science and modern software engineering.',
    });
    await categoryRepo.save(category);
    console.log('Created demo category [computer-science-demo].');
  }

  // 4. Find or Create Demo Published Course
  const courseSlug = 'full-stack-web-development-demo';
  let course = await courseRepo.findOne({ where: { slug: courseSlug } });
  if (!course) {
    console.log('Creating featured published demo course...');
    course = courseRepo.create({
      title: 'Full-Stack Modern Web Engineering',
      slug: courseSlug,
      shortDescription: 'Master modern full-stack development with React, NestJS, and PostgreSQL.',
      description: 'A comprehensive college-level hands-on course covering frontend architecture, REST APIs, database relations, and automated grading.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      instructorId: instructor.id,
      categoryId: category.id,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      estimatedDuration: 12,
      price: 0.0,
      currency: 'USD',
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
      prerequisites: [],
      learningOutcomes: [
        'Design scalable full-stack applications with Next.js and NestJS',
        'Implement secure JWT authentication and role-based access control',
        'Model relational databases using TypeORM and PostgreSQL',
      ],
      skills: [],
    });
    await courseRepo.save(course);

    // Create Section 1
    const section1 = sectionRepo.create({
      courseId: course.id,
      title: 'Module 1: Architecture & Foundations',
      description: 'Core concepts of modular software architecture and RESTful APIs.',
      displayOrder: 1,
    });
    await sectionRepo.save(section1);

    // Create Lessons
    const lesson1 = lessonRepo.create({
      sectionId: section1.id,
      title: 'Introduction to Full-Stack Architecture',
      description: 'Understanding client-server separation and database modeling.',
      contentType: LessonContentType.TEXT,
      textContent: 'In modern web development, decoupling presentation from API services creates scalable, maintainable architectures...',
      estimatedDuration: 15,
      displayOrder: 1,
      isPreview: true,
    });
    await lessonRepo.save(lesson1);

    const lesson2 = lessonRepo.create({
      sectionId: section1.id,
      title: 'Component Architecture Assessment',
      description: 'Test your understanding of full-stack patterns.',
      contentType: LessonContentType.TEXT,
      textContent: 'Review core OOP and architectural concepts prior to taking the certification quiz.',
      estimatedDuration: 20,
      displayOrder: 2,
      isPreview: false,
    });
    await lessonRepo.save(lesson2);

    // Create Quiz on Lesson 2
    const quiz = quizRepo.create({
      lessonId: lesson2.id,
      title: 'Full-Stack Architecture Mastery Quiz',
      instructions: 'Answer all questions to qualify for your course completion certificate.',
      timeLimitMinutes: 15,
      maxAttempts: 3,
      passingScore: 70.0,
      isPublished: true,
    });
    await quizRepo.save(quiz);

    // Create Quiz Questions
    const q1 = questionRepo.create({
      quizId: quiz.id,
      questionText: 'Which protocol is primarily used for stateless communication between Next.js and NestJS?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 50,
      displayOrder: 1,
      explanation: 'REST APIs communicate over HTTP/HTTPS.',
    });
    await questionRepo.save(q1);

    await optionRepo.save([
      optionRepo.create({ questionId: q1.id, optionText: 'HTTP / HTTPS REST', isCorrect: true, displayOrder: 1 }),
      optionRepo.create({ questionId: q1.id, optionText: 'FTP', isCorrect: false, displayOrder: 2 }),
      optionRepo.create({ questionId: q1.id, optionText: 'SMTP', isCorrect: false, displayOrder: 3 }),
    ]);

    const q2 = questionRepo.create({
      quizId: quiz.id,
      questionText: 'What algorithm is utilized in OCMS for secure memory-hard password hashing?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 50,
      displayOrder: 2,
      explanation: 'Argon2 is the modern cryptographic winner of the Password Hashing Competition.',
    });
    await questionRepo.save(q2);

    await optionRepo.save([
      optionRepo.create({ questionId: q2.id, optionText: 'Argon2', isCorrect: true, displayOrder: 1 }),
      optionRepo.create({ questionId: q2.id, optionText: 'MD5', isCorrect: false, displayOrder: 2 }),
      optionRepo.create({ questionId: q2.id, optionText: 'Plaintext', isCorrect: false, displayOrder: 3 }),
    ]);

    console.log('Demo course, sections, lessons, and quiz provisioned successfully!');
  } else {
    console.log('Demo course already exists.');
  }

  console.log(`
=================================================================================
DEMO PROVISIONING COMPLETE:
Administrator: admin@ocms.com      / AdminSecurePass123!
Instructor:    instructor@ocms.com / InstructorSecurePass123!
Student:       student@ocms.com    / StudentSecurePass123!
Featured Demo: /courses/${courseSlug}
=================================================================================
  `);

  await AppDataSource.destroy();
}

seedDemo().catch((err) => {
  console.error('Demo seeding failed:', err);
  process.exit(1);
});
