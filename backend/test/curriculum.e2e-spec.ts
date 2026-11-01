/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { LessonContentType } from '../src/modules/curriculum/enums/lesson-content-type.enum';

describe('Curriculum & Learning Content Management (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructor1Token: string;
  let instructor2Token: string;
  let student1Token: string;
  let student2Token: string;

  let categoryId: string;
  let freeCourseId: string;
  let paidCourseId: string;
  let draftCourseId: string;

  let section1Id: string;
  let section2Id: string;
  let previewLessonId: string;
  let protectedLessonId: string;
  let textLessonId: string;

  let paidSectionId: string;
  let paidLessonId: string;

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
    const inst1Email = `inst1_curr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Primary Curriculum Instructor',
      email: inst1Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const inst1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst1Email, password: 'StrongPass123!' });
    instructor1Token = inst1Login.body.accessToken;

    // 3. Register & Login Instructor 2
    const inst2Email = `inst2_curr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Competitor Instructor',
      email: inst2Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const inst2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst2Email, password: 'StrongPass123!' });
    instructor2Token = inst2Login.body.accessToken;

    // 4. Register & Login Student 1
    const s1Email = `student1_curr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Curriculum Student Alice',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 5. Register & Login Student 2
    const s2Email = `student2_curr_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Curriculum Student Bob',
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
      .send({ name: `Curriculum Cat ${Date.now()}` });
    categoryId = catRes.body.id;

    // 7. Create Free Course & Publish it
    const freeRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Open Curriculum Software Engineering',
        description: 'Complete hands-on software engineering curriculum and labs',
        categoryId,
        price: 0,
        learningOutcomes: ['Software Architecture', 'Clean Code'],
      });
    freeCourseId = freeRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${freeCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 8. Create Paid Course & Publish it
    const paidRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Premium Cloud Native Kubernetes Mastery',
        description: 'Production grade container orchestration and networking masterclass',
        categoryId,
        price: 89.99,
        currency: 'USD',
        learningOutcomes: ['Kubernetes Pods', 'Ingress Controllers'],
      });
    paidCourseId = paidRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${paidCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 9. Create Draft Course
    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Unpublished Curriculum Draft',
        description: 'Draft lessons in progress not visible to public students',
        categoryId,
        price: 19.99,
      });
    draftCourseId = draftRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 1. INSTRUCTOR SECTION MANAGEMENT
  // ==========================================

  describe('Instructor Section Management', () => {
    it('should allow course owner instructor to create sections with sequential display order', async () => {
      // Create Section 1 (displayOrder 0)
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Module 1: Principles of Architecture',
          description: 'Foundational concepts and principles',
          displayOrder: 0,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.id).toBeDefined();
      expect(res1.body.title).toBe('Module 1: Principles of Architecture');
      expect(res1.body.displayOrder).toBe(0);
      section1Id = res1.body.id;

      // Create Section 2 (displayOrder 1)
      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Module 2: Advanced Design Patterns',
          description: 'Structural and behavioral patterns in TypeScript',
          displayOrder: 1,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.displayOrder).toBe(1);
      section2Id = res2.body.id;
    });

    it('should reject section creation if user is not the course owner (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
        .set('Authorization', `Bearer ${instructor2Token}`)
        .send({ title: 'Malicious Section Injection' });

      expect(res.status).toBe(403);
    });

    it('should reject section creation if user is a student (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ title: 'Student Attempt Section' });

      expect(res.status).toBe(403);
    });

    it('should update section when authorized instructor requests update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/sections/${section1Id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ title: 'Module 1: Core System Architecture' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Module 1: Core System Architecture');
    });

    it('should prevent non-owner instructor from modifying section', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/sections/${section1Id}`)
        .set('Authorization', `Bearer ${instructor2Token}`)
        .send({ title: 'Tampered Section Title' });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. INSTRUCTOR LESSON MANAGEMENT
  // ==========================================

  describe('Instructor Lesson Management', () => {
    it('should create video preview lesson in section 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Lesson 1.1: Architecture Introduction',
          description: 'High-level welcome and curriculum overview',
          contentType: LessonContentType.VIDEO,
          videoUrl: 'https://cdn.ocms.edu/videos/welcome.mp4',
          estimatedDuration: 12,
          displayOrder: 0,
          isPreview: true, // Free sample preview lesson
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.contentType).toBe(LessonContentType.VIDEO);
      expect(res.body.isPreview).toBe(true);
      expect(res.body.videoUrl).toBe('https://cdn.ocms.edu/videos/welcome.mp4');
      previewLessonId = res.body.id;
    });

    it('should create protected video lesson in section 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Lesson 1.2: Deep Dive into Microkernel Pattern',
          description: 'Comprehensive analysis of extensible plugin architecture',
          contentType: LessonContentType.VIDEO,
          videoUrl: 'https://cdn.ocms.edu/videos/microkernel.mp4',
          estimatedDuration: 35,
          displayOrder: 1,
          isPreview: false, // Protected lesson
        });

      expect(res.status).toBe(201);
      expect(res.body.isPreview).toBe(false);
      protectedLessonId = res.body.id;
    });

    it('should create text lesson with reading material', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Lesson 1.3: Architecture Case Studies',
          description: 'Real-world case studies reading material',
          contentType: LessonContentType.TEXT,
          textContent: '### Case Study 1\nScalable event routing using Kafka.',
          estimatedDuration: 20,
          displayOrder: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.contentType).toBe(LessonContentType.TEXT);
      textLessonId = res.body.id;
    });

    it('should reject lesson creation with invalid content type (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Invalid Content Type Lesson',
          contentType: 'VIRTUAL_REALITY',
        });

      expect(res.status).toBe(400);
    });

    it('should reject lesson creation with unsafe javascript: URL scheme (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Unsafe URL Lesson',
          contentType: LessonContentType.VIDEO,
          videoUrl: 'javascript:alert(1)',
        });

      expect(res.status).toBe(400);
    });

    it('should prevent non-owner instructor from adding lessons to section 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${section1Id}/lessons`)
        .set('Authorization', `Bearer ${instructor2Token}`)
        .send({
          title: 'Unauthorized Injected Lesson',
          contentType: LessonContentType.TEXT,
          textContent: 'Injected content',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 3. STUDENT & PUBLIC CURRICULUM ACCESS
  // ==========================================

  describe('Curriculum Outline & Public Discovery', () => {
    it('should return curriculum outline to unauthenticated visitor with protected content hidden', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/courses/${freeCourseId}/curriculum`,
      );

      expect(res.status).toBe(200);
      expect(res.body.hasAccess).toBe(false);
      expect(res.body.sections).toHaveLength(2);

      const section1 = res.body.sections.find((s: any) => s.id === section1Id);
      expect(section1).toBeDefined();
      expect(section1.lessons).toHaveLength(3);

      // Lesson 1.1 is PREVIEW -> content unlocked
      const previewLesson = section1.lessons.find((l: any) => l.id === previewLessonId);
      expect(previewLesson.isPreview).toBe(true);
      expect(previewLesson.isUnlocked).toBe(true);
      expect(previewLesson.videoUrl).toBe('https://cdn.ocms.edu/videos/welcome.mp4');

      // Lesson 1.2 is PROTECTED -> content locked & hidden from unauthenticated visitor
      const protectedLesson = section1.lessons.find((l: any) => l.id === protectedLessonId);
      expect(protectedLesson.isPreview).toBe(false);
      expect(protectedLesson.isUnlocked).toBe(false);
      expect(protectedLesson.videoUrl).toBeUndefined(); // Kept hidden!
    });

    it('should allow unauthenticated visitor to view preview lesson directly', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/lessons/${previewLessonId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.title).toContain('Architecture Introduction');
      expect(res.body.videoUrl).toBe('https://cdn.ocms.edu/videos/welcome.mp4');
      expect(res.body.isUnlocked).toBe(true);
    });

    it('should reject unauthenticated request for non-preview protected lesson (401 Unauthorized)', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/lessons/${protectedLessonId}`,
      );

      expect(res.status).toBe(401);
    });

    it('should reject unenrolled student request for protected lesson (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${protectedLessonId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow enrolled student in free course to access all protected lessons', async () => {
      // 1. Enroll Student 1 in free course
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${freeCourseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      // 2. Fetch full curriculum outline as enrolled student -> hasAccess is true!
      const outlineRes = await request(app.getHttpServer())
        .get(`/api/v1/courses/${freeCourseId}/curriculum`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(outlineRes.status).toBe(200);
      expect(outlineRes.body.hasAccess).toBe(true);

      // 3. Access protected lesson directly -> 200 OK with full video URL!
      const lessonRes = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${protectedLessonId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(lessonRes.status).toBe(200);
      expect(lessonRes.body.title).toContain('Microkernel Pattern');
      expect(lessonRes.body.videoUrl).toBe('https://cdn.ocms.edu/videos/microkernel.mp4');
      expect(lessonRes.body.isUnlocked).toBe(true);
    });
  });

  // ==========================================
  // 4. PAID COURSE CURRICULUM ACCESS CONTROL
  // ==========================================

  describe('Paid Course Access Enforcement', () => {
    beforeAll(async () => {
      // Create section and lesson in paid course
      const secRes = await request(app.getHttpServer())
        .post(`/api/v1/instructor/courses/${paidCourseId}/sections`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Module 1: Production Kubernetes',
          displayOrder: 0,
        });
      paidSectionId = secRes.body.id;

      const lesRes = await request(app.getHttpServer())
        .post(`/api/v1/instructor/sections/${paidSectionId}/lessons`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Lesson 1.1: Kubernetes Networking CNI',
          contentType: LessonContentType.VIDEO,
          videoUrl: 'https://cdn.ocms.edu/videos/k8s-cni.mp4',
          estimatedDuration: 45,
          isPreview: false,
        });
      paidLessonId = lesRes.body.id;
    });

    it('should deny paid lesson access to student with pending payment (403 Forbidden)', async () => {
      // Initiate checkout creates PENDING_PAYMENT enrollment
      await request(app.getHttpServer())
        .post('/api/v1/payments/checkout-session')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ courseId: paidCourseId });

      // Attempt to access paid lesson prior to payment completion
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${paidLessonId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should grant access to course owner instructor even without enrollment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${paidLessonId}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.videoUrl).toBe('https://cdn.ocms.edu/videos/k8s-cni.mp4');
    });

    it('should deny access to other instructor who does not own the paid course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${paidLessonId}`)
        .set('Authorization', `Bearer ${instructor2Token}`);

      expect(res.status).toBe(403);
    });

    it('should grant access to Admin for any course lesson', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lessons/${paidLessonId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toContain('Kubernetes Networking');
    });
  });

  // ==========================================
  // 5. UNPUBLISHED COURSE PRIVACY PROTECTION
  // ==========================================

  describe('Unpublished Course Privacy Protection', () => {
    it('should reject public / student curriculum access for draft courses with 404', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/courses/${draftCourseId}/curriculum`,
      );

      expect(res.status).toBe(404);
    });

    it('should allow course owner instructor to view curriculum for their own draft course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/courses/${draftCourseId}/curriculum`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasAccess).toBe(true);
    });
  });
});
