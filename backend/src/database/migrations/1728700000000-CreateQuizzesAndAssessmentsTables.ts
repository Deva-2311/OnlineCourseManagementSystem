import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizzesAndAssessmentsTables1728700000000 implements MigrationInterface {
  name = 'CreateQuizzesAndAssessmentsTables1728700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_question_type_enum') THEN
          CREATE TYPE "quiz_question_type_enum" AS ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_attempt_status_enum') THEN
          CREATE TYPE "quiz_attempt_status_enum" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
        END IF;
      END$$;
    `);

    // 2. Quizzes Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quizzes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lessonId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "instructions" text,
        "timeLimitMinutes" integer,
        "maxAttempts" integer NOT NULL DEFAULT 1,
        "passingScore" numeric(5,2) NOT NULL DEFAULT 70.00,
        "isPublished" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_quizzes_timeLimitMinutes" CHECK ("timeLimitMinutes" IS NULL OR "timeLimitMinutes" > 0),
        CONSTRAINT "CHK_quizzes_maxAttempts" CHECK ("maxAttempts" >= 1),
        CONSTRAINT "CHK_quizzes_passingScore" CHECK ("passingScore" >= 0 AND "passingScore" <= 100),
        CONSTRAINT "FK_quizzes_lesson" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE
      );
    `);

    // 3. Quiz Questions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quiz_questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quizId" uuid NOT NULL,
        "questionText" text NOT NULL,
        "questionType" "quiz_question_type_enum" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
        "points" integer NOT NULL DEFAULT 1,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "explanation" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quiz_questions_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_quiz_questions_points" CHECK ("points" >= 1),
        CONSTRAINT "CHK_quiz_questions_displayOrder" CHECK ("displayOrder" >= 0),
        CONSTRAINT "FK_quiz_questions_quiz" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE
      );
    `);

    // 4. Question Options Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_options" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "questionId" uuid NOT NULL,
        "optionText" text NOT NULL,
        "isCorrect" boolean NOT NULL DEFAULT false,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_options_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_question_options_displayOrder" CHECK ("displayOrder" >= 0),
        CONSTRAINT "FK_question_options_question" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE
      );
    `);

    // 5. Quiz Attempts Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quiz_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quizId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "attemptNumber" integer NOT NULL DEFAULT 1,
        "status" "quiz_attempt_status_enum" NOT NULL DEFAULT 'IN_PROGRESS',
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "submittedAt" TIMESTAMP WITH TIME ZONE,
        "score" numeric(6,2) NOT NULL DEFAULT 0.00,
        "maxScore" numeric(6,2) NOT NULL DEFAULT 0.00,
        "percentage" numeric(5,2) NOT NULL DEFAULT 0.00,
        "isPassed" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quiz_attempts_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_quiz_attempts_attemptNumber" CHECK ("attemptNumber" >= 1),
        CONSTRAINT "CHK_quiz_attempts_score" CHECK ("score" >= 0),
        CONSTRAINT "CHK_quiz_attempts_maxScore" CHECK ("maxScore" >= 0),
        CONSTRAINT "CHK_quiz_attempts_percentage" CHECK ("percentage" >= 0 AND "percentage" <= 100),
        CONSTRAINT "FK_quiz_attempts_quiz" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quiz_attempts_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // 6. Student Answers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_answers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "attemptId" uuid NOT NULL,
        "questionId" uuid NOT NULL,
        "selectedOptionId" uuid,
        "awardedPoints" numeric(6,2) NOT NULL DEFAULT 0.00,
        "isCorrect" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_answers_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_student_answers_awardedPoints" CHECK ("awardedPoints" >= 0),
        CONSTRAINT "FK_student_answers_attempt" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_student_answers_question" FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_student_answers_selectedOption" FOREIGN KEY ("selectedOptionId") REFERENCES "question_options"("id") ON DELETE SET NULL
      );
    `);

    // 7. Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_quizzes_lessonId" ON "quizzes" ("lessonId");
      CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_quizId" ON "quiz_questions" ("quizId");
      CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_displayOrder" ON "quiz_questions" ("displayOrder");
      CREATE INDEX IF NOT EXISTS "IDX_question_options_questionId" ON "question_options" ("questionId");
      CREATE INDEX IF NOT EXISTS "IDX_quiz_attempts_quiz_student" ON "quiz_attempts" ("quizId", "studentId");
      CREATE INDEX IF NOT EXISTS "IDX_quiz_attempts_status" ON "quiz_attempts" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_student_answers_attemptId" ON "student_answers" ("attemptId");
      CREATE INDEX IF NOT EXISTS "IDX_student_answers_questionId" ON "student_answers" ("questionId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_answers_questionId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_answers_attemptId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_attempts_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_attempts_quiz_student";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_question_options_questionId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_questions_displayOrder";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_questions_quizId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quizzes_lessonId";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "student_answers";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quiz_attempts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_options";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quiz_questions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quizzes";`);

    await queryRunner.query(`DROP TYPE IF EXISTS "quiz_attempt_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quiz_question_type_enum";`);
  }
}
