/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { DifficultyLevel } from '../src/modules/courses/enums/difficulty-level.enum';

describe('Smart Course Recommendations (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructorToken: string;
  let student1Token: string;
  let student2Token: string;
  let newStudentToken: string;

  let category1Id: string;
  let category2Id: string;

  let publishedCourse1Id: string; // Cat 1, Beginner
  let publishedCourse2Id: string; // Cat 1, Intermediate, Prerequisite: Course 1
  let publishedCourse3Id: string; // Cat 2, Beginner
  let draftCourseId: string; // Cat 1, Draft
  let unmetPrereqCourseId: string; // Cat 2, Prerequisite: Unmet course

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const timestamp = Date.now();

    // 1. Admin login
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ocms.com', password: 'AdminSecurePass123!' });
    adminToken = adminLogin.body.accessToken;

    // Helper to register & login
    const registerAndLogin = async (email: string, fullName: string, role: UserRole) => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          fullName,
          password: 'StrongPass123!',
          role,
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'StrongPass123!' })
        .expect(200);

      return loginRes.body.accessToken;
    };

    instructorToken = await registerAndLogin(`rec_inst_${timestamp}@example.com`, 'Instructor Rec', UserRole.INSTRUCTOR);
    student1Token = await registerAndLogin(`rec_student1_${timestamp}@example.com`, 'Student One', UserRole.STUDENT);
    student2Token = await registerAndLogin(`rec_student2_${timestamp}@example.com`, 'Student Two', UserRole.STUDENT);
    newStudentToken = await registerAndLogin(`rec_new_student_${timestamp}@example.com`, 'New Student', UserRole.STUDENT);

    // 2. Create categories
    const createCategory = async (name: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, description: `${name} description` })
        .expect(201);
      return res.body.id;
    };

    category1Id = await createCategory(`Computer Science ${timestamp}`);
    category2Id = await createCategory(`Data Science ${timestamp}`);

    // Helper to create and publish a course
    const createAndPublishCourse = async (
      title: string,
      categoryId: string,
      difficultyLevel: DifficultyLevel,
      prerequisites: string[] = [],
      publish = true,
    ) => {
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/instructor/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title,
          description: `Comprehensive academic coursework covering ${title} fundamentals thoroughly.`,
          categoryId,
          difficultyLevel,
          estimatedDuration: 12,
          price: 0,
          currency: 'USD',
          prerequisites,
          learningOutcomes: ['Core Mastery'],
        })
        .expect(201);

      const courseId = courseRes.body.id;

      if (publish) {
        // Submit for review
        await request(app.getHttpServer())
          .post(`/api/v1/instructor/courses/${courseId}/submit`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        // Approve and publish
        await request(app.getHttpServer())
          .post(`/api/v1/admin/courses/${courseId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      return courseId;
    };

    // Course 1: Cat 1, Beginner
    publishedCourse1Id = await createAndPublishCourse(
      `CS 101 Intro ${timestamp}`,
      category1Id,
      DifficultyLevel.BEGINNER,
      [],
      true,
    );

    // Course 2: Cat 1, Intermediate (Prerequisite is Course 1 title)
    publishedCourse2Id = await createAndPublishCourse(
      `CS 201 Algorithms ${timestamp}`,
      category1Id,
      DifficultyLevel.INTERMEDIATE,
      [`CS 101 Intro ${timestamp}`],
      true,
    );

    // Course 3: Cat 2, Beginner
    publishedCourse3Id = await createAndPublishCourse(
      `Data 101 Intro ${timestamp}`,
      category2Id,
      DifficultyLevel.BEGINNER,
      [],
      true,
    );

    // Course with unmet prerequisite (requires Course 3 which Student 1 never took)
    unmetPrereqCourseId = await createAndPublishCourse(
      `Data 301 Advanced Deep Learning ${timestamp}`,
      category2Id,
      DifficultyLevel.ADVANCED,
      [`Data 101 Intro ${timestamp}`],
      true,
    );

    // Draft course: Should NEVER be recommended
    draftCourseId = await createAndPublishCourse(
      `Draft Unpublished Course ${timestamp}`,
      category1Id,
      DifficultyLevel.BEGINNER,
      [],
      false,
    );

    // Student 1 enrolls in Course 1
    await request(app.getHttpServer())
      .post(`/api/v1/courses/${publishedCourse1Id}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`)
      .expect(200);

    // Add a section and lesson to Course 1
    const sectionRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${publishedCourse1Id}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Module 1' })
      .expect(201);

    const lessonRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${sectionRes.body.id}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Lecture 1',
        contentType: 'TEXT',
        textContent: 'Introduction text content',
      })
      .expect(201);

    // Mark completed
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${lessonRes.body.id}/progress/complete`)
      .set('Authorization', `Bearer ${student1Token}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Access Control', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .expect(401);
    });

    it('should reject non-student role with 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(403);
    });
  });

  describe('Personalization & Filtering', () => {
    it('should return fallback recommendations for a new student with no enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${newStudentToken}`)
        .expect(200);

      expect(res.body.meta.isFallback).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify no unpublished course leaked
      const courseIds = res.body.data.map((item: any) => item.course.id);
      expect(courseIds).not.toContain(draftCourseId);
    });

    it('should exclude courses the student is already enrolled in', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      const courseIds = res.body.data.map((item: any) => item.course.id);
      expect(courseIds).not.toContain(publishedCourse1Id);
    });

    it('should prioritize the next course in sequence whose prerequisite was satisfied', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      // Student 1 completed Course 1, so Course 2 (which requires Course 1) must be recommended
      const topRec = res.body.data[0];
      expect(topRec.course.id).toBe(publishedCourse2Id);
      expect(topRec.signals).toContain(
        'Direct progression following your completed coursework',
      );
    });

    it('should exclude courses where prerequisite requirements are unmet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      // Student 1 did not take Course 3 (Data 101), so unmetPrereqCourseId (requires Data 101) must NOT appear
      const courseIds = res.body.data.map((item: any) => item.course.id);
      expect(courseIds).not.toContain(unmetPrereqCourseId);
    });

    it('should support limit query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me?limit=1')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.limit).toBe(1);
    });

    it('should reject invalid limit parameter with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recommendations/me?limit=0')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/recommendations/me?limit=25')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/recommendations/me?limit=abc')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(400);
    });

    it('should support categoryId filter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/recommendations/me?categoryId=${category2Id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      for (const item of res.body.data) {
        expect(item.course.category.id).toBe(category2Id);
      }
    });

    it('should produce deterministic ordering across multiple requests', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      const ids1 = res1.body.data.map((i: any) => i.course.id);
      const ids2 = res2.body.data.map((i: any) => i.course.id);
      expect(ids1).toEqual(ids2);
    });

    it('should not leak sensitive instructor or moderation fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recommendations/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      for (const item of res.body.data) {
        expect(item.course).not.toHaveProperty('rejectionReason');
        expect(item.course.instructor).not.toHaveProperty('passwordHash');
        expect(item.course.instructor).not.toHaveProperty('email');
      }
    });
  });
});
