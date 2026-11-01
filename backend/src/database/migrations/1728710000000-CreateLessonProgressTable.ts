import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonProgressTable1728710000000 implements MigrationInterface {
  name = 'CreateLessonProgressTable1728710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type for lesson progress status
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_progress_status_enum') THEN
          CREATE TYPE "lesson_progress_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
        END IF;
      END$$;
    `);

    // 2. Create lesson_progress table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "lessonId" uuid NOT NULL,
        "enrollmentId" uuid NOT NULL,
        "status" "lesson_progress_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "lastAccessedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lesson_progress_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_lesson_progress_enrollment_lesson" UNIQUE ("enrollmentId", "lessonId"),
        CONSTRAINT "FK_lesson_progress_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lesson_progress_lesson" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lesson_progress_enrollment" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lesson_progress_studentId" ON "lesson_progress" ("studentId");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_progress_lessonId" ON "lesson_progress" ("lessonId");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_progress_enrollmentId" ON "lesson_progress" ("enrollmentId");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_progress_status" ON "lesson_progress" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_progress_student_lesson" ON "lesson_progress" ("studentId", "lessonId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_progress_student_lesson";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_progress_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_progress_enrollmentId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_progress_lessonId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_progress_studentId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_progress";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_progress_status_enum";`);
  }
}
