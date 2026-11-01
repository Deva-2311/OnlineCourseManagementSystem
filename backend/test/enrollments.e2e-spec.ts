/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { EnrollmentStatus } from '../src/modules/enrollments/enums/enrollment-status.enum';

describe('Enrollment System (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructorToken: string;
  let otherInstructorToken: string;
  let student1Token: string;
  let student2Token: string;

  let categoryId: string;
  let freeCourseId: string;
  let paidCourseId: string;
  let draftCourseId: string;

  let student1EnrollmentId: string;

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

    // 1. Authenticate Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ocms.com', password: 'AdminSecurePass123!' });
    adminToken = adminLogin.body.accessToken;

    // 2. Register & Login Instructor 1
    const instEmail = `inst_enr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Enrollment Instructor',
      email: instEmail,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const instLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: instEmail, password: 'StrongPass123!' });
    instructorToken = instLogin.body.accessToken;

    // 3. Register & Login Instructor 2
    const otherInstEmail = `other_inst_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Other Instructor',
      email: otherInstEmail,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const otherInstLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: otherInstEmail, password: 'StrongPass123!' });
    otherInstructorToken = otherInstLogin.body.accessToken;

    // 4. Register & Login Student 1
    const s1Email = `student1_enr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Student Alice',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 5. Register & Login Student 2
    const s2Email = `student2_enr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Student Bob',
      email: s2Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s2Email, password: 'StrongPass123!' });
    student2Token = s2Login.body.accessToken;

    // 6. Create Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Enrollment Cat ${Date.now()}` });
    categoryId = catRes.body.id;

    // 7. Create Free Course & Publish it
    const freeCourseRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Free Open Source Engineering Course',
        description: 'Complete introduction to contributing to open source projects.',
        categoryId,
        price: 0,
        learningOutcomes: ['Git workflows', 'Open source collaboration'],
      });
    freeCourseId = freeCourseRes.body.id;

    // Submit & Approve Free Course
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${freeCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 8. Create Paid Course & Publish it
    const paidCourseRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Paid Advanced Architecture Mastery',
        description: 'Deep dive into enterprise microservices architecture with hands-on labs.',
        categoryId,
        price: 129.99,
        learningOutcomes: ['Enterprise architecture', 'CQRS & Event Sourcing'],
      });
    paidCourseId = paidCourseRes.body.id;

    // Submit & Approve Paid Course
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${paidCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 9. Create Draft Course (Unpublished)
    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Unpublished Draft Course Concept',
        description: 'Course still in development and not approved for public enrollment.',
        categoryId,
        price: 0,
        learningOutcomes: ['WIP'],
      });
    draftCourseId = draftRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Enrollment Role and Authentication Constraints', () => {
    it('should reject unauthenticated enrollment with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .expect(401);
    });

    it('should reject instructors from enrolling in courses with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(403);
    });

    it('should reject admins from enrolling in courses with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('Course State and Existence Validation', () => {
    it('should return 404 NotFound when attempting to enroll in non-existent course', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/courses/00000000-0000-0000-0000-000000000000/enroll')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(404);
    });

    it('should reject enrollment in unpublished DRAFT courses with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${draftCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(400);

      expect(res.body.message).toContain('only permitted for published courses');
    });
  });

  describe('Free Course Enrollment Workflow', () => {
    it('should successfully enroll student with ACTIVE status in free course', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.requiresPayment).toBe(false);
      expect(res.body.enrollment).toBeDefined();
      expect(res.body.enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      expect(res.body.enrollment.enrolledAt).toBeDefined();
      expect(res.body.message).toContain('Successfully enrolled');

      student1EnrollmentId = res.body.enrollment.id;
    });

    it('should prevent duplicate active enrollment with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(409);

      expect(res.body.message).toContain('already actively enrolled');
    });
  });

  describe('Paid Course Enrollment Workflow', () => {
    it('should create PENDING_PAYMENT enrollment without granting active access', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/courses/${paidCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.requiresPayment).toBe(true);
      expect(res.body.amount).toBe(129.99);
      expect(res.body.enrollment.status).toBe(EnrollmentStatus.PENDING_PAYMENT);
      expect(res.body.enrollment.enrolledAt).toBeNull();
      expect(res.body.message).toContain('Payment authorization is required');
    });

    it('should verify student status shows not actively enrolled for paid pending course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${paidCourseId}/enrollment-status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.isEnrolled).toBe(false);
      expect(res.body.status).toBe(EnrollmentStatus.PENDING_PAYMENT);
    });
  });

  describe('Student Enrollment Visibility & Privacy Access Control', () => {
    it('should list all enrollments for current student GET /api/v1/enrollments/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // free + paid pending
    });

    it('should allow student to view their own enrollment by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${student1EnrollmentId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.id).toBe(student1EnrollmentId);
    });

    it('should deny another student from viewing this enrollment with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${student1EnrollmentId}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(403);
    });

    it('should return accurate private enrollment status for free active course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${freeCourseId}/enrollment-status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.isEnrolled).toBe(true);
      expect(res.body.status).toBe(EnrollmentStatus.ACTIVE);
      expect(res.body.enrollmentId).toBe(student1EnrollmentId);
    });
  });

  describe('Instructor and Admin Visibility Operations', () => {
    it('should allow course owner instructor to view enrolled students', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/instructor/courses/${freeCourseId}/enrollments`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((e: any) => e.student.name === 'Student Alice')).toBe(true);
    });

    it('should deny other instructors from viewing enrollments with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/instructor/courses/${freeCourseId}/enrollments`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .expect(403);
    });

    it('should allow admin to list all enrollments GET /api/v1/admin/enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });
});
