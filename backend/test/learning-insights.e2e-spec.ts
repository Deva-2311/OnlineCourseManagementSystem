/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { QuestionType } from '../src/modules/quizzes/enums/question-type.enum';
import { SkillProficiencyStatus } from '../src/modules/learning-insights/enums/skill-proficiency-status.enum';
import { LearningStepType } from '../src/modules/learning-insights/enums/learning-step-type.enum';
import { AccessStatus } from '../src/modules/learning-insights/enums/access-status.enum';

describe('Skill-Gap Analysis & Adaptive Learning Paths (e2e)', () => {
  let app: INestApplication;

  let adminToken: string;
  let instructorToken: string;
  let student1Token: string;
  let student2Token: string;

  let categoryId: string;
  let skill1Id: string; // Database Indexing
  let skill2Id: string; // SQL Querying

  let courseId: string;
  let sectionId: string;
  let lesson1Id: string;
  let quizId: string;
  let q1Id: string;
  let q1OptionCorrectId: string;
  let q1OptionIncorrectId: string;
  let q2Id: string;
  let q2OptionCorrectId: string;
  let q2OptionIncorrectId: string;

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

    instructorToken = await registerAndLogin(`gap_inst_${timestamp}@example.com`, 'Instructor Gap', UserRole.INSTRUCTOR);
    student1Token = await registerAndLogin(`gap_stud1_${timestamp}@example.com`, 'Student Gap One', UserRole.STUDENT);
    student2Token = await registerAndLogin(`gap_stud2_${timestamp}@example.com`, 'Student Gap Two', UserRole.STUDENT);

    // 2. Create Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Database Systems ${timestamp}`, description: 'Databases & Storage' })
      .expect(201);
    categoryId = catRes.body.id;

    // 3. Create Skills
    const s1Res = await request(app.getHttpServer())
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        name: `Database Indexing ${timestamp}`,
        description: 'B-Trees, Hash Indexes, and Execution Plans',
        categoryId,
      })
      .expect(201);
    skill1Id = s1Res.body.id;

    const s2Res = await request(app.getHttpServer())
      .post('/api/v1/skills')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        name: `SQL Optimization ${timestamp}`,
        description: 'Query rewriting and joins',
        categoryId,
      })
      .expect(201);
    skill2Id = s2Res.body.id;

    // 4. Create and publish course
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/instructor/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: `Relational Database Internals ${timestamp}`,
        description: 'Comprehensive database engine internals course.',
        categoryId,
        price: 0,
        learningOutcomes: ['Understand B-Trees', 'Optimize SQL queries'],
      })
      .expect(201);
    courseId = courseRes.body.id;

    // Map skill to course
    await request(app.getHttpServer())
      .put(`/api/v1/skills/courses/${courseId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ skillIds: [skill1Id, skill2Id] })
      .expect(200);

    // Create section
    const secRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Section 1: Indexing & Storage' })
      .expect(201);
    sectionId = secRes.body.id;

    // Create lesson
    const lesRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'B-Tree Index Deep Dive',
        textContent: 'Detailed lesson on node splitting and balancing in B+ trees.',
        contentType: 'TEXT',
      })
      .expect(201);
    lesson1Id = lesRes.body.id;

    // Map skill to lesson
    await request(app.getHttpServer())
      .put(`/api/v1/skills/lessons/${lesson1Id}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ skillIds: [skill1Id] })
      .expect(200);

    // Create quiz
    const quizRes = await request(app.getHttpServer())
      .post(`/api/v1/instructor/lessons/${lesson1Id}/quizzes`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Indexing & Query Mastery Quiz',
        instructions: 'Answer all questions to verify topic retention.',
        passingScore: 70,
        timeLimitMinutes: 15,
        maxAttempts: 3,
      })
      .expect(201);
    quizId = quizRes.body.id;

    // Add Question 1 (Assessing Skill 1: Indexing)
    const q1Res = await request(app.getHttpServer())
      .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        questionText: 'What is the primary advantage of a B+ Tree over a traditional B Tree?',
        questionType: QuestionType.MULTIPLE_CHOICE,
        points: 10,
        options: [
          { optionText: 'Sequential scanning efficiency via leaf node pointers', isCorrect: true },
          { optionText: 'Smaller total storage size', isCorrect: false },
        ],
      })
      .expect(201);
    q1Id = q1Res.body.id;
    q1OptionCorrectId = q1Res.body.options[0].id;
    q1OptionIncorrectId = q1Res.body.options[1].id;

    // Map Question 1 to Skill 1
    await request(app.getHttpServer())
      .put(`/api/v1/skills/questions/${q1Id}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ skillId: skill1Id })
      .expect(200);

    // Add Question 2 (Also Assessing Skill 1: Indexing)
    const q2Res = await request(app.getHttpServer())
      .post(`/api/v1/instructor/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        questionText: 'A hash index is ideal for range queries like BETWEEN 10 AND 50.',
        questionType: QuestionType.TRUE_FALSE,
        points: 10,
        options: [
          { optionText: 'True', isCorrect: false },
          { optionText: 'False', isCorrect: true },
        ],
      })
      .expect(201);
    q2Id = q2Res.body.id;
    q2OptionIncorrectId = q2Res.body.options[0].id;
    q2OptionCorrectId = q2Res.body.options[1].id;

    // Map Question 2 to Skill 1
    await request(app.getHttpServer())
      .put(`/api/v1/skills/questions/${q2Id}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ skillId: skill1Id })
      .expect(200);

    // Publish quiz
    await request(app.getHttpServer())
      .patch(`/api/v1/instructor/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ isPublished: true })
      .expect(200);

    // Publish course
    await request(app.getHttpServer())
      .post(`/api/v1/instructor/courses/${courseId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/courses/${courseId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // 1. AUTHORIZATION & ACCESS GUARDS
  // ==========================================

  describe('Security & Access Control', () => {
    it('should reject unauthenticated request to /api/v1/learning-insights/me (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .expect(401);
    });

    it('should reject unauthenticated request to /api/v1/learning-paths/me (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/learning-paths/me')
        .expect(401);
    });

    it('should reject instructor role from accessing student learning insights (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(403);
    });

    it('should reject admin role from accessing student learning path (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/learning-paths/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  // ==========================================
  // 2. EMPTY STATE & FALLBACK ROADMAPS
  // ==========================================

  describe('Empty State & Fallback Pathways', () => {
    it('should return zeroed insights summary for student with no quiz attempts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalSkillsAssessed).toBe(0);
      expect(res.body.summary.needsImprovementCount).toBe(0);
      expect(res.body.skills).toEqual([]);
    });

    it('should return fallback learning path for student with no quiz attempts or enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/learning-paths/me')
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(200);

      expect(res.body.meta.isFallback).toBe(true);
      expect(res.body.meta.hasSkillGaps).toBe(false);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].stepType).toBe(LearningStepType.RECOMMENDED_COURSE);
      expect([AccessStatus.ENROLLMENT_REQUIRED, AccessStatus.PAYMENT_REQUIRED]).toContain(
        res.body.data[0].accessStatus,
      );
    });
  });

  // ==========================================
  // 3. SKILL GAP DETECTION & ACCURACY CALCULATION
  // ==========================================

  describe('Empirical Skill-Gap Detection & Adaptive Roadmap', () => {
    it('should calculate accurate proficiency and identify skill gaps after quiz submission', async () => {
      // 1. Enroll Student 1 in course
      await request(app.getHttpServer())
        .post(`/api/v1/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      // 2. Start attempt
      const startRes = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(201);

      const attemptId = startRes.body.id;

      // 3. Submit 0 correct out of 2 questions for Skill 1 (0% -> NEEDS_IMPROVEMENT)
      await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [
            { questionId: q1Id, selectedOptionId: q1OptionIncorrectId },
            { questionId: q2Id, selectedOptionId: q2OptionIncorrectId },
          ],
        })
        .expect(200);

      // 4. Fetch Insights
      const insightsRes = await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(insightsRes.body.summary.totalSkillsAssessed).toBe(1);
      expect(insightsRes.body.summary.needsImprovementCount).toBe(1);
      expect(insightsRes.body.summary.strongSkillsCount).toBe(0);

      const skill1Proficiency = insightsRes.body.skills[0];
      expect(skill1Proficiency.skillId).toBe(skill1Id);
      expect(skill1Proficiency.status).toBe(SkillProficiencyStatus.NEEDS_IMPROVEMENT);
      expect(skill1Proficiency.masteryScore).toBe(0);
      expect(skill1Proficiency.totalQuestionsAttempted).toBe(2);
      expect(skill1Proficiency.correctAnswersCount).toBe(0);

      // 5. Fetch Adaptive Learning Path
      const pathRes = await request(app.getHttpServer())
        .get('/api/v1/learning-paths/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(pathRes.body.meta.hasSkillGaps).toBe(true);
      expect(pathRes.body.meta.isFallback).toBe(false);

      // Remedial lesson recommendation for lesson1Id
      const remedialStep = pathRes.body.data.find(
        (step: any) => step.stepType === LearningStepType.REMEDIAL_LESSON,
      );
      expect(remedialStep).toBeDefined();
      expect(remedialStep.reference.lessonId).toBe(lesson1Id);
      expect(remedialStep.accessStatus).toBe(AccessStatus.ACCESSIBLE);
      expect(remedialStep.reason).toContain('Remedial review');

      // Practice quiz recommendation for quizId
      const quizStep = pathRes.body.data.find(
        (step: any) => step.stepType === LearningStepType.PRACTICE_QUIZ,
      );
      expect(quizStep).toBeDefined();
      expect(quizStep.reference.quizId).toBe(quizId);
      expect(quizStep.accessStatus).toBe(AccessStatus.ACCESSIBLE);
    });

    it('should reflect retake improvements without double counting historical attempts', async () => {
      // Retake attempt by Student 1: 2 out of 2 correct (100% -> STRONG)
      const startRes = await request(app.getHttpServer())
        .post(`/api/v1/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(201);

      const retakeAttemptId = startRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/quiz-attempts/${retakeAttemptId}/submit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          answers: [
            { questionId: q1Id, selectedOptionId: q1OptionCorrectId },
            { questionId: q2Id, selectedOptionId: q2OptionCorrectId },
          ],
        })
        .expect(200);

      const insightsRes = await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      // After retake, only latest attempt is considered: 2 total questions, 2 correct = 100% STRONG
      expect(insightsRes.body.summary.totalSkillsAssessed).toBe(1);
      expect(insightsRes.body.summary.strongSkillsCount).toBe(1);
      expect(insightsRes.body.summary.needsImprovementCount).toBe(0);

      const skill1Proficiency = insightsRes.body.skills[0];
      expect(skill1Proficiency.status).toBe(SkillProficiencyStatus.STRONG);
      expect(skill1Proficiency.masteryScore).toBe(100);
      expect(skill1Proficiency.totalQuestionsAttempted).toBe(2);
      expect(skill1Proficiency.correctAnswersCount).toBe(2);
    });

    it('should ensure complete student data isolation', async () => {
      // Student 2 has not taken any quizzes yet
      const student2Insights = await request(app.getHttpServer())
        .get('/api/v1/learning-insights/me')
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(200);

      expect(student2Insights.body.summary.totalSkillsAssessed).toBe(0);
      expect(student2Insights.body.skills.length).toBe(0);
    });
  });
});
