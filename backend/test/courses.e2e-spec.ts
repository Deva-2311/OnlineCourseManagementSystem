/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { CourseStatus } from '../src/modules/courses/enums/course-status.enum';

describe('Course Management & Moderation (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructorToken: string;
  let instructor2Token: string;
  let studentToken: string;

  let categoryId: string;
  let courseId: string;
  let courseSlug: string;

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

    // 1. Authenticate admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ocms.com', password: 'AdminSecurePass123!' });
    adminToken = adminLoginRes.body.accessToken;

    // 2. Register & authenticate Instructor 1
    const instEmail = `instructor_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Primary Instructor',
      email: instEmail,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const instLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: instEmail, password: 'StrongPass123!' });
    instructorToken = instLoginRes.body.accessToken;

    // 3. Register & authenticate Instructor 2 (for unauthorized mutation tests)
    const inst2Email = `instructor2_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Secondary Instructor',
      email: inst2Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const inst2LoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst2Email, password: 'StrongPass123!' });
    instructor2Token = inst2LoginRes.body.accessToken;

    // 4. Register & authenticate Student
    const studentEmail = `student_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Enrolled Student',
      email: studentEmail,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const studentLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: studentEmail, password: 'StrongPass123!' });
    studentToken = studentLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Category Management', () => {
    const categoryName = `Computer Science ${Date.now()}`;

    it('should deny non-admins from creating categories with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ name: categoryName })
        .expect(403);
    });

    it('should allow admin to create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: categoryName,
          description: 'Fundamental CS topics',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(categoryName);
      expect(res.body.slug).toBeDefined();
      categoryId = res.body.id;
    });

    it('should reject duplicate category name with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryName })
        .expect(409);
    });

    it('should allow public access to GET /api/v1/categories without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === categoryId)).toBe(true);
    });
  });

  describe('Course Creation & Ownership Enforcement', () => {
    it('should reject unauthenticated course creation with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/instructor/courses')
        .send({
          title: 'Unauthenticated Course',
          description: 'Should not be allowed to create without authentication',
          categoryId,
        })
        .expect(401);
    });

    it('should deny students from creating courses with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/instructor/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Attempted Course',
          description: 'Students do not have instructor permissions to create courses.',
          categoryId,
        })
        .expect(403);
    });

    it('should allow authenticated instructor to create a DRAFT course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/instructor/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Advanced Microservices with NestJS',
          description: 'Detailed curriculum covering message queues, gRPC, and container orchestration.',
          categoryId,
          price: 79.99,
          estimatedDuration: 30,
          learningOutcomes: ['Design gRPC microservices', 'Scale Kubernetes clusters'],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(CourseStatus.DRAFT);
      expect(res.body.slug).toContain('advanced-microservices-with-nestjs');
      courseId = res.body.id;
      courseSlug = res.body.slug;
    });

    it('should deny other instructors from updating another instructor course with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/instructor/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructor2Token}`)
        .send({ title: 'Hacked Title By Other Instructor' })
        .expect(403);
    });
  });

  describe('Course Lifecycle & Moderation Workflow', () => {
    it('should submit DRAFT course for review (transitioning to PENDING_REVIEW)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(res.body.status).toBe(CourseStatus.PENDING_REVIEW);
    });

    it('should prevent editing while course is PENDING_REVIEW', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/instructor/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ shortDescription: 'Trying to update while in review queue' })
        .expect(400);
    });

    it('should deny instructor from approving their own course with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(403);
    });

    it('should list pending courses in admin moderation queue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/courses/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.some((c: any) => c.id === courseId)).toBe(true);
    });

    it('should reject course moderation without feedback reason', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Short' }) // Less than 10 characters
        .expect(400);
    });

    it('should allow admin to reject course with meaningful reason (transition to REJECTED)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Please provide more details on prerequisites and video sample links.',
        })
        .expect(200);

      expect(res.body.status).toBe(CourseStatus.REJECTED);
      expect(res.body.rejectionReason).toContain('details on prerequisites');
    });

    it('should allow instructor to update rejected course (returning it to DRAFT)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          description: 'Updated comprehensive curriculum addressing admin feedback regarding video samples and prerequisites.',
        })
        .expect(200);

      expect(res.body.status).toBe(CourseStatus.DRAFT);
      expect(res.body.rejectionReason).toBeNull();
    });

    it('should resubmit course for review and then approve by admin (transition to PUBLISHED)', async () => {
      // 1. Resubmit
      await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      // 2. Admin approves
      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(approveRes.body.status).toBe(CourseStatus.PUBLISHED);
      expect(approveRes.body.publishedAt).toBeDefined();
    });
  });

  describe('Public Discovery & Catalogue', () => {
    it('should return published course in public catalog GET /api/v1/courses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses')
        .expect(200);

      expect(res.body.data.some((c: any) => c.id === courseId)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve published course by slug without leaking moderation notes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${courseSlug}`)
        .expect(200);

      expect(res.body.id).toBe(courseId);
      expect(res.body.title).toContain('Advanced Microservices');
      expect(res.body.instructorName).toBeDefined();
      expect(res.body.rejectionReason).toBeUndefined();
    });

    it('should support search query filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses?search=Microservices')
        .expect(200);

      expect(res.body.data.some((c: any) => c.id === courseId)).toBe(true);
    });
  });

  describe('Referential Safety on Category Deletion', () => {
    it('should reject deleting category that is referenced by active courses', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
