/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { LessonContentType } from '../src/modules/curriculum/enums/lesson-content-type.enum';
import { QuestionType } from '../src/modules/quizzes/enums/question-type.enum';

describe('Learning Progress Tracking System (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructor1Token: string;
  let instructor2Token: string;
  let student1Token: string;
  let student2Token: string;
  let student1Id: string;
  let student2Id: string;

  let categoryId: string;
  let freeCourseId: string;
  let paidCourseId: string;
  let emptyCourseId: string;

  let freeSectionId: string;
  let lesson1Id: string;
  let lesson2Id: string;

  let paidSectionId: string;
  let paidLessonId: string;

  let freeEnrollmentId: string;
  let paidEnrollmentId: string;

  let quizId: string;

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
    const inst1Email = `inst1_prog_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Systems Lead Instructor',
      email: inst1Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const i1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst1Email, password: 'StrongPass123!' });
    instructor1Token = i1Login.body.accessToken;

    // 3. Register & Login Instructor 2
    const inst2Email = `inst2_prog_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Foreign Systems Instructor',
      email: inst2Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const i2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst2Email, password: 'StrongPass123!' });
    instructor2Token = i2Login.body.accessToken;

    // 4. Register & Login Student 1
    const s1Email = `student1_prog_${Date.now()}@example.com`;
    const s1Reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Enrolled Student One',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    student1Id = s1Reg.body.id;
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 5. Register & Login Student 2
    const s2Email = `student2_prog_${Date.now()}@example.com`;
    const s2Reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Peer Student Two',
      email: s2Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    student2Id = s2Reg.body.id;
    const s2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s2Email, password: 'StrongPass123!' });
    student2Token = s2Login.body.accessToken;

    // 6. Create Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Computer Systems ${Date.now()}`,
        description: 'Systems Architecture',
      });
    categoryId = catRes.body.id;

    // 7. Setup Free Course (with 2 lessons)
    const freeRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: `Computer Systems 101 ${Date.now()}`,
        description: 'Comprehensive CS foundations',
        categoryId,
        price: 0,
        learningOutcomes: ['Understand CPU Datapaths', 'Write Assembly'],
      });
    freeCourseId = freeRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${freeCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Create sections & lessons for Free Course
    const freeSecRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({ title: 'Module 1: Machine Organization', displayOrder: 0 });
    freeSectionId = freeSecRes.body.id;

    const l1Res = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${freeSectionId}/lessons`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Lecture 1: Datapaths',
        contentType: LessonContentType.VIDEO,
        videoUrl: 'https://cdn.example.com/l1.mp4',
        estimatedDuration: 45,
        displayOrder: 0,
      });
    lesson1Id = l1Res.body.id;

    const l2Res = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${freeSectionId}/lessons`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Lecture 2: Memory Hierarchy',
        contentType: LessonContentType.TEXT,
        textContent: 'Memory caching and latency mitigations',
        estimatedDuration: 30,
        displayOrder: 1,
      });
    lesson2Id = l2Res.body.id;

    // Attach a Quiz to Lesson 1 for quiz summary verification
    const quizRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/lessons/${lesson1Id}/quizzes`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Datapaths Checkpoint',
        instructions: 'Test your understanding of register transfer logic',
        timeLimitMinutes: 10,
        maxAttempts: 2,
        passingScore: 70,
        isPublished: false,
      });
    quizId = quizRes.body.id;

    // Add question to quiz
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        questionText: 'Is the program counter an internal register?',
        questionType: QuestionType.TRUE_FALSE,
        points: 10,
        displayOrder: 0,
        options: [
          { optionText: 'True', isCorrect: true, displayOrder: 0 },
          { optionText: 'False', isCorrect: false, displayOrder: 1 },
        ],
      });

    // Publish quiz now that questions exist
    await request(app.getHttpServer())
      .patch(`/api/v1/instructor/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({ isPublished: true });

    // 8. Setup Paid Course ($49.99)
    const paidRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: `Advanced Microarchitecture ${Date.now()}`,
        description: 'Superscalar and out-of-order execution',
        categoryId,
        price: 49.99,
        learningOutcomes: ['Branch Predictors', 'Tomasulo Algorithm'],
      });
    paidCourseId = paidRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${paidCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const paidSecRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/sections`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({ title: 'Advanced Pipelines', displayOrder: 0 });
    paidSectionId = paidSecRes.body.id;

    const paidLRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${paidSectionId}/lessons`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Out of Order Execution',
        contentType: LessonContentType.VIDEO,
        videoUrl: 'https://cdn.example.com/ooo.mp4',
        displayOrder: 0,
      });
    paidLessonId = paidLRes.body.id;

    // 9. Setup Empty Course (0 lessons)
    const emptyRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: `Empty Curriculum Seminar ${Date.now()}`,
        description: 'Course with no lessons initially',
        categoryId,
        price: 0,
        learningOutcomes: ['Independent Research'],
      });
    emptyCourseId = emptyRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${emptyCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${emptyCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 10. Enroll Student 1 in Free Course
    const enrRes = await request(app.getHttpServer())
      .post(`/api/v1/courses/${freeCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    freeEnrollmentId = enrRes.body.enrollment.id;

    // 11. Initiate Unpaid Enrollment for Student 1 in Paid Course
    const paidEnrRes = await request(app.getHttpServer())
      .post(`/api/v1/courses/${paidCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    paidEnrollmentId = paidEnrRes.body.enrollment.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication & Role Permissions', () => {
    it('should reject unauthenticated requests to start progress (401)', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/lessons/${lesson1Id}/progress/start`,
      );
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to complete progress (401)', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/lessons/${lesson1Id}/progress/complete`,
      );
      expect(res.status).toBe(401);
    });

    it('should prevent instructors from mutating student progress endpoints (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/start`)
        .set('Authorization', `Bearer ${instructor1Token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Lesson Progress Lifecycle & Access Rules', () => {
    it('should allow authorized enrolled student to start lesson progress', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/start`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.progress.status).toBe('IN_PROGRESS');
      expect(res.body.progress.lessonId).toBe(lesson1Id);
      expect(res.body.progress.startedAt).toBeDefined();
    });

    it('should be idempotent: repeated start does not create duplicate record or change startedAt', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/start`)
        .set('Authorization', `Bearer ${student1Token}`);
      const initialStartedAt = res1.body.progress.startedAt;

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/start`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.progress.id).toBe(res1.body.progress.id);
      expect(res2.body.progress.startedAt).toBe(initialStartedAt);
    });

    it('should allow student to query their lesson progress', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${lesson1Id}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.lessonId).toBe(lesson1Id);
    });

    it('should return NOT_STARTED for unstarted lesson', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${lesson2Id}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('NOT_STARTED');
      expect(res.body.startedAt).toBeNull();
      expect(res.body.completedAt).toBeNull();
    });

    it('should reject non-enrolled student from starting progress (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/start`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not enrolled');
    });

    it('should reject paid course progress when enrollment is unpaid/PENDING_PAYMENT (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${paidLessonId}/progress/start`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('verified payment');
    });
  });

  describe('3. Lesson Completion & Backend Course Progress Calculation', () => {
    it('should mark lesson 1 as complete and calculate 50% course progress', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/complete`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.progress.status).toBe('COMPLETED');
      expect(res.body.progress.completedAt).toBeDefined();

      // Course progress summary
      expect(res.body.courseProgress).toBeDefined();
      expect(res.body.courseProgress.totalLessons).toBe(2);
      expect(res.body.courseProgress.completedLessons).toBe(1);
      expect(res.body.courseProgress.remainingLessons).toBe(1);
      expect(res.body.courseProgress.completionPercentage).toBe(50.0);
      expect(res.body.courseProgress.isCompleted).toBe(false);
    });

    it('should be idempotent: repeating complete preserves original completedAt', async () => {
      const getRes1 = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${lesson1Id}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);
      const originalCompletedAt = getRes1.body.completedAt;

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/complete`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.progress.completedAt).toBe(originalCompletedAt);
    });

    it('should fetch course progress summary via enrollment endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${freeEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courseId).toBe(freeCourseId);
      expect(res.body.totalLessons).toBe(2);
      expect(res.body.completedLessons).toBe(1);
      expect(res.body.completionPercentage).toBe(50.0);
      expect(res.body.lessons).toHaveLength(2);

      // Verify Lesson 1 has safe quiz summary without answer keys
      const l1 = res.body.lessons.find((l: any) => l.lessonId === lesson1Id);
      expect(l1.status).toBe('COMPLETED');
      expect(l1.quizzes).toBeDefined();
      expect(l1.quizzes[0].title).toBe('Datapaths Checkpoint');
      expect(l1.quizzes[0].options).toBeUndefined();
    });

    it('should fetch course progress summary via course endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${freeCourseId}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courseId).toBe(freeCourseId);
      expect(res.body.totalLessons).toBe(2);
      expect(res.body.completedLessons).toBe(1);
    });

    it('should complete remaining lesson 2, reach 100%, and auto-complete enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson2Id}/progress/complete`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courseProgress.totalLessons).toBe(2);
      expect(res.body.courseProgress.completedLessons).toBe(2);
      expect(res.body.courseProgress.remainingLessons).toBe(0);
      expect(res.body.courseProgress.completionPercentage).toBe(100.0);
      expect(res.body.courseProgress.isCompleted).toBe(true);
    });

    it('should ignore arbitrary client percentage or status submissions (tamper-proof)', async () => {
      // Trying to tamper by sending forged percentage, unstarted status, and another student's ID
      const res = await request(app.getHttpServer())
        .post(`/api/v1/lessons/${lesson1Id}/progress/complete`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ completionPercentage: 0, status: 'NOT_STARTED', studentId: student2Id });

      expect(res.status).toBe(200);
      expect(res.body.progress.status).toBe('COMPLETED');
      expect(res.body.progress.studentId).toBe(student1Id);
      expect(res.body.progress.studentId).not.toBe(student2Id);
      expect(res.body.courseProgress.completionPercentage).toBe(100.0);
    });
  });

  describe('4. Privacy, Empty Curriculum & Edge Cases', () => {
    it('should prevent student from viewing another student’s enrollment progress (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${freeEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('another student');
    });

    it('should safely handle empty curriculum without dividing by zero (0%)', async () => {
      // Enroll student 1 in empty course
      const emptyEnr = await request(app.getHttpServer())
        .post(`/api/v1/courses/${emptyCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${emptyEnr.body.enrollment.id}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalLessons).toBe(0);
      expect(res.body.completedLessons).toBe(0);
      expect(res.body.completionPercentage).toBe(0.0);
      expect(res.body.isCompleted).toBe(false);
    });
  });

  describe('5. Instructor Progress Visibility & RBAC', () => {
    it('should allow course owner instructor to view student progress in their course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/instructor/courses/${freeCourseId}/progress?page=1&limit=10`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const studentProg = res.body.data.find(
        (item: any) => item.student.id === student1Id,
      );
      expect(studentProg).toBeDefined();
      expect(studentProg.student.fullName).toBe('Enrolled Student One');
      expect(studentProg.totalLessons).toBe(2);
      expect(studentProg.completedLessons).toBe(2);
      expect(studentProg.completionPercentage).toBe(100.0);
      expect(studentProg.isCompleted).toBe(true);

      // Verify privacy: no password hashes or sensitive billing details leaked
      expect(studentProg.student.passwordHash).toBeUndefined();
      expect(studentProg.student.hashedRefreshToken).toBeUndefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should reject non-owning instructor from viewing course progress (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/instructor/courses/${freeCourseId}/progress`)
        .set('Authorization', `Bearer ${instructor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not own this course');
    });

    it('should reject students from accessing instructor progress endpoint (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/instructor/courses/${freeCourseId}/progress`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });
  });
});
