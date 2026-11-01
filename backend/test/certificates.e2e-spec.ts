/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { LessonContentType } from '../src/modules/curriculum/enums/lesson-content-type.enum';
import { QuestionType } from '../src/modules/quizzes/enums/question-type.enum';

describe('Certificates & Public Verification System (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructorToken: string;
  let student1Token: string;
  let student2Token: string;
  let student1Id: string;
  let student2Id: string;

  let categoryId: string;

  // Complete eligible course
  let eligibleCourseId: string;
  let eligibleEnrollmentId: string;
  let eligibleLesson1Id: string;
  let eligibleLesson2Id: string;
  let eligibleQuizId: string;

  // Incomplete course
  let incompleteCourseId: string;
  let incompleteEnrollmentId: string;
  let incompleteLesson1Id: string;
  let incompleteLesson2Id: string;

  // Course with failed assessment
  let failedQuizCourseId: string;
  let failedQuizEnrollmentId: string;
  let failedQuizLessonId: string;
  let failedQuizId: string;

  // Paid course (unpaid enrollment)
  let paidCourseId: string;
  let paidEnrollmentId: string;

  let issuedCertificateId: string;
  let issuedCertificateNumber: string;

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

    // 1. Admin login
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@ocms.com', password: 'AdminSecurePass123!' });
    adminToken = adminLogin.body.accessToken;

    // 2. Instructor register & login
    const instEmail = `inst_cert_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Credential Lead Instructor',
      email: instEmail,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const iLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: instEmail, password: 'StrongPass123!' });
    instructorToken = iLogin.body.accessToken;

    // 3. Student 1 register & login
    const s1Email = `student1_cert_${Date.now()}@example.com`;
    const s1Reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Graduating Student Alpha',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    student1Id = s1Reg.body.id;
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 4. Student 2 register & login
    const s2Email = `student2_cert_${Date.now()}@example.com`;
    const s2Reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Peer Student Beta',
      email: s2Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    student2Id = s2Reg.body.id;
    const s2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s2Email, password: 'StrongPass123!' });
    student2Token = s2Login.body.accessToken;

    // 5. Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Certifications ${Date.now()}` });
    categoryId = catRes.body.id;

    // 6. Setup ELIGIBLE COURSE (2 lessons, 1 quiz)
    const elRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: `Systems Certification Masterclass ${Date.now()}`,
        description: 'Comprehensive verifiable program',
        categoryId,
        price: 0,
        learningOutcomes: ['Datapath Verification', 'Pipelining Certification'],
      });
    eligibleCourseId = elRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${eligibleCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${eligibleCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const elSecRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${eligibleCourseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Module 1: Foundations' });
    const elSecId = elSecRes.body.id;

    const elL1 = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${elSecId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Lesson 1', contentType: LessonContentType.VIDEO });
    eligibleLesson1Id = elL1.body.id;

    const elL2 = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${elSecId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Lesson 2', contentType: LessonContentType.TEXT, textContent: 'Core notes' });
    eligibleLesson2Id = elL2.body.id;

    // Attach quiz to Lesson 1
    const qRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/lessons/${eligibleLesson1Id}/quizzes`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Certification Checkpoint',
        instructions: 'Answer all items',
        passingScore: 70,
        isPublished: false,
      });
    eligibleQuizId = qRes.body.id;

    const optRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/quizzes/${eligibleQuizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        questionText: 'Is cache memory faster than RAM?',
        questionType: QuestionType.TRUE_FALSE,
        points: 10,
        displayOrder: 0,
        options: [
          { optionText: 'True', isCorrect: true, displayOrder: 0 },
          { optionText: 'False', isCorrect: false, displayOrder: 1 },
        ],
      });
    const correctOptId = optRes.body.options.find((o: any) => o.optionText === 'True').id;
    const qId = optRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/instructor/quizzes/${eligibleQuizId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ isPublished: true });

    // Enroll Student 1 in Eligible Course
    const enrEl = await request(app.getHttpServer())
      .post(`/api/v1/courses/${eligibleCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    eligibleEnrollmentId = enrEl.body.enrollment.id;

    // Student 1 completes Lesson 1 & Lesson 2
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${eligibleLesson1Id}/progress/complete`)
      .set('Authorization', `Bearer ${student1Token}`);
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${eligibleLesson2Id}/progress/complete`)
      .set('Authorization', `Bearer ${student1Token}`);

    // Student 1 takes quiz and passes it with 100%
    const attemptStart = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${eligibleQuizId}/attempts`)
      .set('Authorization', `Bearer ${student1Token}`);
    const attId = attemptStart.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/quiz-attempts/${attId}/submit`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        answers: [{ questionId: qId, selectedOptionId: correctOptId }],
      });

    // 7. Setup INCOMPLETE COURSE
    const incRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: `Incomplete Curriculum Course ${Date.now()}`,
        description: 'Student has not finished all units',
        categoryId,
        price: 0,
        learningOutcomes: ['Unit A', 'Unit B'],
      });
    incompleteCourseId = incRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${incompleteCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${incompleteCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const incSecRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${incompleteCourseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Module 1' });

    const incL1 = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${incSecRes.body.id}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Unit 1', contentType: LessonContentType.VIDEO });
    incompleteLesson1Id = incL1.body.id;

    const incL2 = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${incSecRes.body.id}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Unit 2', contentType: LessonContentType.VIDEO });
    incompleteLesson2Id = incL2.body.id;

    const incEnr = await request(app.getHttpServer())
      .post(`/api/v1/courses/${incompleteCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    incompleteEnrollmentId = incEnr.body.enrollment.id;

    // Student 1 only completes Unit 1 (leaving Unit 2 incomplete)
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${incompleteLesson1Id}/progress/complete`)
      .set('Authorization', `Bearer ${student1Token}`);

    // 8. Setup FAILED QUIZ COURSE
    const fqRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: `Failed Quiz Seminar ${Date.now()}`,
        description: 'Assessment not passed',
        categoryId,
        price: 0,
        learningOutcomes: ['Difficult Exam'],
      });
    failedQuizCourseId = fqRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${failedQuizCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${failedQuizCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const fqSec = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${failedQuizCourseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Exam Module' });

    const fqL = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${fqSec.body.id}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Exam Prep', contentType: LessonContentType.VIDEO });
    failedQuizLessonId = fqL.body.id;

    const fqQ = await request(app.getHttpServer())
      .post(`/api/v1/instructor/lessons/${failedQuizLessonId}/quizzes`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Final Comprehensive Exam', passingScore: 80, isPublished: false });
    failedQuizId = fqQ.body.id;

    const fqOpt = await request(app.getHttpServer())
      .post(`/api/v1/instructor/quizzes/${failedQuizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        questionText: 'Select true statement',
        questionType: QuestionType.TRUE_FALSE,
        points: 10,
        options: [
          { optionText: 'True', isCorrect: true, displayOrder: 0 },
          { optionText: 'False', isCorrect: false, displayOrder: 1 },
        ],
      });
    const incorrectOptId = fqOpt.body.options.find((o: any) => o.optionText === 'False').id;
    const fqQId = fqOpt.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/instructor/quizzes/${failedQuizId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ isPublished: true });

    const fqEnr = await request(app.getHttpServer())
      .post(`/api/v1/courses/${failedQuizCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    failedQuizEnrollmentId = fqEnr.body.enrollment.id;

    // Complete lesson
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${failedQuizLessonId}/progress/complete`)
      .set('Authorization', `Bearer ${student1Token}`);

    // Take quiz and FAIL it with 0%
    const fqAtt = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${failedQuizId}/attempts`)
      .set('Authorization', `Bearer ${student1Token}`);
    await request(app.getHttpServer())
      .post(`/api/v1/quiz-attempts/${fqAtt.body.id}/submit`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ answers: [{ questionId: fqQId, selectedOptionId: incorrectOptId }] });

    // 9. Setup PAID COURSE ($79.99) with unpaid enrollment
    const paidRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: `Enterprise Executive Architecture ${Date.now()}`,
        description: 'Paid premium course with full enterprise architecture curriculum',
        categoryId,
        price: 79.99,
        learningOutcomes: ['Enterprise Architecture'],
      });
    paidCourseId = paidRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${paidCourseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${paidCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const paidEnr = await request(app.getHttpServer())
      .post(`/api/v1/courses/${paidCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);
    paidEnrollmentId = paidEnr.body.enrollment.id; // Status: PENDING_PAYMENT
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication & Role Permissions', () => {
    it('should reject unauthenticated certificate issuance requests (401)', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/enrollments/${eligibleEnrollmentId}/certificate`,
      );
      expect(res.status).toBe(401);
    });

    it('should reject non-student role calling certificate issuance (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${eligibleEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject student issuing certificate for another student enrollment (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${eligibleEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student2Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('own enrollments');
    });
  });

  describe('2. Eligibility Enforcement', () => {
    it('should reject issuance if paid course has unpaid enrollment (PENDING_PAYMENT) (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${paidEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('verified payment');
    });

    it('should reject issuance if course lessons are incomplete (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${incompleteEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('curriculum is incomplete');
    });

    it('should reject issuance if required course quiz has not been passed (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${failedQuizEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('pass all required assessments');
    });
  });

  describe('3. Successful Issuance & Idempotency', () => {
    it('should successfully issue an authentic certificate for an eligible student (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${eligibleEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.certificateNumber).toMatch(/^OCMS-CERT-/);
      expect(res.body.recipientName).toBe('Graduating Student Alpha');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.verificationUrl).toContain(res.body.certificateNumber);

      issuedCertificateId = res.body.id;
      issuedCertificateNumber = res.body.certificateNumber;
    });

    it('should be idempotent: repeated issuance request returns existing certificate without duplicating (200)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${eligibleEnrollmentId}/certificate`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(issuedCertificateId);
      expect(res.body.certificateNumber).toBe(issuedCertificateNumber);
    });

    it('should allow student to list their certificates via /certificates/me (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/certificates/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].certificateNumber).toBe(issuedCertificateNumber);
    });

    it('should allow student to view their certificate details by ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${issuedCertificateId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(issuedCertificateId);
      expect(res.body.certificateNumber).toBe(issuedCertificateNumber);
    });

    it('should prevent student from viewing another student’s certificate (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${issuedCertificateId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('another student');
    });
  });

  describe('4. Server-Side PDF Generation & Downloads', () => {
    it('should allow student to download authoritative certificate PDF (200, application/pdf)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${issuedCertificateId}/download`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain(`certificate-${issuedCertificateNumber}.pdf`);
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(1000); // Standard PDF binary payload
    });

    it('should prevent another student from downloading the certificate PDF (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${issuedCertificateId}/download`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Public Verification (No Auth Required)', () => {
    it('should publicly verify active certificate without authentication (200)', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/certificates/verify/${issuedCertificateNumber}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(true);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.certificateNumber).toBe(issuedCertificateNumber);
      expect(res.body.recipientName).toBe('Graduating Student Alpha');
      expect(res.body.courseTitle).toContain('Systems Certification');
      expect(res.body.issuedAt).toBeDefined();

      // Ensure privacy: no student email, user ID, or billing details exposed
      expect(res.body.studentId).toBeUndefined();
      expect(res.body.email).toBeUndefined();
      expect(res.body.enrollmentId).toBeUndefined();
    });

    it('should return 404 for unknown/invalid certificate number', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/certificates/verify/OCMS-CERT-DOES-NOT-EXIST-999',
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('6. Administrative Revocation Lifecycle', () => {
    it('should allow admin to revoke an issued certificate (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/certificates/${issuedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Credential invalidated due to administrative review' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REVOKED');
      expect(res.body.revokedAt).toBeDefined();
      expect(res.body.revocationReason).toBe('Credential invalidated due to administrative review');
    });

    it('should publicly report revoked certificate as invalid (200, isValid: false)', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/certificates/verify/${issuedCertificateNumber}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.status).toBe('REVOKED');
      expect(res.body.revocationReason).toBe('Credential invalidated due to administrative review');
    });

    it('should reject downloading a revoked certificate (400)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${issuedCertificateId}/download`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('revoked certificate');
    });
  });
});
