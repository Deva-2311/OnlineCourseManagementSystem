/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { LessonContentType } from '../src/modules/curriculum/enums/lesson-content-type.enum';
import { QuestionType } from '../src/modules/quizzes/enums/question-type.enum';
import { QuizAttemptStatus } from '../src/modules/quizzes/enums/quiz-attempt-status.enum';

describe('Quizzes & Assessments System (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructor1Token: string;
  let instructor2Token: string;
  let student1Token: string;
  let student2Token: string;

  let categoryId: string;
  let freeCourseId: string;
  let paidCourseId: string;

  let sectionId: string;
  let lessonId: string;

  let paidSectionId: string;
  let paidLessonId: string;

  let quizId: string;
  let question1Id: string;
  let q1Option1Id: string;
  let q1Option2Id: string;

  let question2Id: string;
  let q2OptionTrueId: string;
  let q2OptionFalseId: string;

  let paidQuizId: string;

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
    const inst1Email = `inst1_quiz_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Assessment Lead Instructor',
      email: inst1Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const i1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst1Email, password: 'StrongPass123!' });
    instructor1Token = i1Login.body.accessToken;

    // 3. Register & Login Instructor 2
    const inst2Email = `inst2_quiz_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Foreign Instructor',
      email: inst2Email,
      password: 'StrongPass123!',
      role: UserRole.INSTRUCTOR,
    });
    const i2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inst2Email, password: 'StrongPass123!' });
    instructor2Token = i2Login.body.accessToken;

    // 4. Register & Login Student 1
    const s1Email = `stud1_quiz_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Enrolled Assessment Student',
      email: s1Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s1Email, password: 'StrongPass123!' });
    student1Token = s1Login.body.accessToken;

    // 5. Register & Login Student 2
    const s2Email = `stud2_quiz_${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      fullName: 'Unenrolled Assessment Student',
      email: s2Email,
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
    });
    const s2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: s2Email, password: 'StrongPass123!' });
    student2Token = s2Login.body.accessToken;

    // 6. Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Assessment Category ${Date.now()}` });
    categoryId = catRes.body.id;

    // 7. Free Course -> Submit -> Approve
    const freeRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Open Computer Systems & Architecture',
        description: 'Complete hands-on systems architecture with assessments',
        categoryId,
        price: 0,
        learningOutcomes: ['Computer Systems Architecture', 'Cache Optimization'],
      });
    freeCourseId = freeRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/submit`)
      .set('Authorization', `Bearer ${instructor1Token}`);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${freeCourseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Section & Lesson in Free Course
    const secRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${freeCourseId}/sections`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({ title: 'Module 1: Memory Hierarchy' });
    sectionId = secRes.body.id;

    const lesRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'L1: Cache Coherence Protocols',
        contentType: LessonContentType.VIDEO,
      });
    lessonId = lesRes.body.id;

    // Student 1 enrolls in Free Course
    await request(app.getHttpServer())
      .post(`/api/v1/courses/${freeCourseId}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`);

    // 8. Paid Course -> Submit -> Approve
    const paidRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'Enterprise High Performance Computing Masterclass',
        description: 'Advanced distributed computing and clusters',
        categoryId,
        price: 99.99,
        learningOutcomes: ['Cluster Architecture', 'Supercomputing'],
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
      .send({ title: 'HPC Module 1: Cluster Architecture' });
    paidSectionId = paidSecRes.body.id;

    const paidLesRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${paidSectionId}/lessons`)
      .set('Authorization', `Bearer ${instructor1Token}`)
      .send({
        title: 'HPC Lesson 1: Supercomputing Interconnects',
        contentType: LessonContentType.VIDEO,
      });
    paidLessonId = paidLesRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 1. INSTRUCTOR QUIZ CREATION & OWNERSHIP
  // ==========================================

  describe('Instructor Quiz Management', () => {
    it('should reject unauthenticated quiz creation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${lessonId}/quizzes`)
        .send({ title: 'Unauthenticated Quiz' });

      expect(res.status).toBe(401);
    });

    it('should reject student from creating a quiz', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${lessonId}/quizzes`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ title: 'Student Quiz Attempt' });

      expect(res.status).toBe(403);
    });

    it('should prevent an instructor from creating a quiz in another instructor’s course', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${lessonId}/quizzes`)
        .set('Authorization', `Bearer ${instructor2Token}`)
        .send({ title: 'Unauthorized Instructor Quiz' });

      expect(res.status).toBe(403);
    });

    it('should reject publishing a brand-new quiz with no questions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${lessonId}/quizzes`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ title: 'Empty Published Quiz', isPublished: true });

      expect(res.status).toBe(400);
    });

    it('should allow authorized instructor to create a draft quiz for their lesson', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${lessonId}/quizzes`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'Quiz 1: Cache Coherence Protocols',
          instructions: 'Answer all objective questions. Passing threshold is 70%.',
          timeLimitMinutes: 10,
          maxAttempts: 2,
          passingScore: 70.0,
          isPublished: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Quiz 1: Cache Coherence Protocols');
      expect(res.body.maxAttempts).toBe(2);
      expect(res.body.isPublished).toBe(false);
      quizId = res.body.id;
    });

    it('should allow instructor to create a quiz for the paid course lesson', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/lessons/${paidLessonId}/quizzes`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          title: 'HPC Premium Quiz 1: Interconnect Topology',
          timeLimitMinutes: 15,
          maxAttempts: 1,
          passingScore: 80.0,
          isPublished: false,
        });

      expect(res.status).toBe(201);
      paidQuizId = res.body.id;
    });
  });

  // ==========================================
  // 2. QUESTION & OPTION CONFIGURATION
  // ==========================================

  describe('Question & Option Management', () => {
    it('should reject question with fewer than 2 options', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'Invalid single-option question?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 5,
          options: [{ optionText: 'Only One Option', isCorrect: true }],
        });

      expect(res.status).toBe(400);
    });

    it('should reject objective question without exactly one correct answer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'Ambiguous question with no correct answer?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 5,
          options: [
            { optionText: 'Option A', isCorrect: false },
            { optionText: 'Option B', isCorrect: false },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('should reject True/False questions that do not have exactly 2 options', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'Is MESI an invalidation-based coherence protocol?',
          questionType: QuestionType.TRUE_FALSE,
          points: 5,
          options: [
            { optionText: 'True', isCorrect: true },
            { optionText: 'False', isCorrect: false },
            { optionText: 'Undetermined', isCorrect: false },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('should allow instructor to add a Multiple Choice question with valid answer key', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'What does the "M" state represent in the standard MESI protocol?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          points: 10,
          displayOrder: 0,
          explanation: 'M represents Modified (dirty, private to this cache).',
          options: [
            { optionText: 'Modified: Cache block is valid, dirty, and only in this cache', isCorrect: true, displayOrder: 0 },
            { optionText: 'Memory: Data is in main memory only', isCorrect: false, displayOrder: 1 },
            { optionText: 'Migrated: Data is in transit between cores', isCorrect: false, displayOrder: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.options.length).toBe(3);
      expect(res.body.options[0].isCorrect).toBe(true);

      question1Id = res.body.id;
      q1Option1Id = res.body.options[0].id; // correct
      q1Option2Id = res.body.options[1].id; // incorrect
    });

    it('should allow instructor to add a True/False question with valid answer key', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'In a snooping-based cache coherence protocol, all cache controllers monitor a shared broadcast medium.',
          questionType: QuestionType.TRUE_FALSE,
          points: 10,
          displayOrder: 1,
          explanation: 'Snooping requires broadcast bus listening.',
          options: [
            { optionText: 'True', isCorrect: true, displayOrder: 0 },
            { optionText: 'False', isCorrect: false, displayOrder: 1 },
          ],
        });

      expect(res.status).toBe(201);
      question2Id = res.body.id;
      q2OptionTrueId = res.body.options[0].id;
      q2OptionFalseId = res.body.options[1].id;
    });

    it('should also add a question to the paid quiz and publish the paid quiz', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/instructor/quizzes/${paidQuizId}/questions`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          questionText: 'Does InfiniBand HDR provide 200 Gbps bandwidth per port?',
          questionType: QuestionType.TRUE_FALSE,
          points: 10,
          options: [
            { optionText: 'True', isCorrect: true },
            { optionText: 'False', isCorrect: false },
          ],
        });

      const pubRes = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/quizzes/${paidQuizId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ isPublished: true });

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.isPublished).toBe(true);
    });
  });

  // ==========================================
  // 3. PUBLICATION WORKFLOW & STUDENT ACCESS
  // ==========================================

  describe('Student Quiz Access & Protected Content', () => {
    it('should reject student access when quiz is not published (404)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(404);
    });

    it('should allow instructor to publish the quiz once questions are configured', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ isPublished: true });

      expect(res.status).toBe(200);
      expect(res.body.isPublished).toBe(true);
    });

    it('should deny student access to quiz if student is not enrolled / paid (403)', async () => {
      // Student 2 is NOT enrolled in the paid course
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quizzes/${paidQuizId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow enrolled student to get the published quiz and never leak answer keys', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Quiz 1: Cache Coherence Protocols');
      expect(res.body.questions.length).toBe(2);

      // Verify answer keys and internal explanations are masked
      for (const question of res.body.questions) {
        expect(question.explanation).toBeUndefined();
        for (const option of question.options) {
          expect(option.isCorrect).toBeUndefined();
        }
      }
    });
  });

  // ==========================================
  // 4. STUDENT ATTEMPTS & AUTO-GRADING
  // ==========================================

  describe('Student Quiz Attempt Lifecycle & Auto-Grading', () => {
    let attempt1Id: string;

    it('should initialize an in-progress quiz attempt for enrolled student', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.attemptNumber).toBe(1);
      expect(res.body.status).toBe(QuizAttemptStatus.IN_PROGRESS);
      expect(res.body.score).toBe(0);
      expect(res.body.maxScore).toBe(20);

      attempt1Id = res.body.id;
    });

    it('should reject starting a duplicate attempt while an active attempt is already in progress', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('active');
    });

    it('should prevent student 2 from reading student 1’s quiz attempt (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quiz-attempts/${attempt1Id}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should prevent student 2 from submitting answers to student 1’s attempt (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ answers: [] });

      expect(res.status).toBe(403);
    });

    it('should reject submission with foreign question ID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [{ questionId: '00000000-0000-4000-8000-000000000001' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to this quiz');
    });

    it('should reject submission with foreign option ID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [
            {
              questionId: question1Id,
              selectedOptionId: '00000000-0000-4000-8000-000000000001',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to question');
    });

    it('should successfully grade attempt with 1 correct and 1 omitted answer', async () => {
      // Question 1: correct answer (10 pts)
      // Question 2: omitted (0 pts)
      // Total: 10 / 20 = 50.0% -> Passing is 70% -> isPassed: false
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [
            { questionId: question1Id, selectedOptionId: q1Option1Id },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(QuizAttemptStatus.SUBMITTED);
      expect(res.body.score).toBe(10);
      expect(res.body.maxScore).toBe(20);
      expect(res.body.percentage).toBe(50);
      expect(res.body.isPassed).toBe(false);
      expect(res.body.answers.length).toBe(2);
    });

    it('should reject resubmitting an already submitted attempt (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ answers: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been submitted');
    });

    it('should allow student 1 to start their second attempt and achieve 100% pass', async () => {
      const startRes = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(startRes.status).toBe(201);
      expect(startRes.body.attemptNumber).toBe(2);
      const attempt2Id = startRes.body.id;

      // Submit both correct answers
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attempt2Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [
            { questionId: question1Id, selectedOptionId: q1Option1Id },
            { questionId: question2Id, selectedOptionId: q2OptionTrueId },
          ],
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.score).toBe(20);
      expect(submitRes.body.maxScore).toBe(20);
      expect(submitRes.body.percentage).toBe(100);
      expect(submitRes.body.isPassed).toBe(true);
    });

    it('should reject a third attempt when maximum attempts limit (2) is reached (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Maximum attempts limit reached');
    });
  });

  // ==========================================
  // 5. HISTORICAL INTEGRITY & QUIZ EDIT RESTRICTIONS
  // ==========================================

  describe('Historical Results & Modification Restrictions', () => {
    it('should reject modifying passingScore or attempts once student attempts exist', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ passingScore: 90.0 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('student attempts already exist');
    });

    it('should reject deleting a question once student attempts exist', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/instructor/questions/${question1Id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('student attempts already exist');
    });

    it('should reject deleting a quiz once student attempts exist', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/instructor/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('student attempts already exist');
    });

    it('should allow modifying non-material fields such as instructions without corrupting scores', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/instructor/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({ instructions: 'Updated review instructions.' });

      expect(res.status).toBe(200);
      expect(res.body.instructions).toBe('Updated review instructions.');
    });
  });
});
