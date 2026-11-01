import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkillsAndLearningPathsTables1728730000000 implements MigrationInterface {
  name = 'CreateSkillsAndLearningPathsTables1728730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create skills table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "slug" character varying(180) NOT NULL,
        "description" text,
        "categoryId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_skills_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_skills_name" UNIQUE ("name"),
        CONSTRAINT "UQ_skills_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_skills_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL
      );
    `);

    // 2. Add skillId and topic to quiz_questions
    await queryRunner.query(`
      ALTER TABLE "quiz_questions" 
      ADD COLUMN IF NOT EXISTS "skillId" uuid,
      ADD COLUMN IF NOT EXISTS "topic" character varying(150);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_quiz_questions_skill'
        ) THEN
          ALTER TABLE "quiz_questions"
          ADD CONSTRAINT "FK_quiz_questions_skill"
          FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    // 3. Create lesson_skills join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_skills" (
        "lessonId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        CONSTRAINT "PK_lesson_skills" PRIMARY KEY ("lessonId", "skillId"),
        CONSTRAINT "FK_lesson_skills_lesson" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lesson_skills_skill" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
      );
    `);

    // 4. Create course_skills join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "course_skills" (
        "courseId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        CONSTRAINT "PK_course_skills" PRIMARY KEY ("courseId", "skillId"),
        CONSTRAINT "FK_course_skills_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_course_skills_skill" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
      );
    `);

    // 5. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_skills_slug" ON "skills" ("slug");
      CREATE INDEX IF NOT EXISTS "IDX_skills_categoryId" ON "skills" ("categoryId");
      CREATE INDEX IF NOT EXISTS "IDX_quiz_questions_skillId" ON "quiz_questions" ("skillId");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_skills_lessonId" ON "lesson_skills" ("lessonId");
      CREATE INDEX IF NOT EXISTS "IDX_lesson_skills_skillId" ON "lesson_skills" ("skillId");
      CREATE INDEX IF NOT EXISTS "IDX_course_skills_courseId" ON "course_skills" ("courseId");
      CREATE INDEX IF NOT EXISTS "IDX_course_skills_skillId" ON "course_skills" ("skillId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_skills_skillId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_skills_courseId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_skills_skillId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lesson_skills_lessonId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_questions_skillId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_skills_categoryId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_skills_slug";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "course_skills";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_skills";`);

    await queryRunner.query(`
      ALTER TABLE "quiz_questions" 
      DROP CONSTRAINT IF EXISTS "FK_quiz_questions_skill",
      DROP COLUMN IF EXISTS "skillId",
      DROP COLUMN IF EXISTS "topic";
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "skills";`);
  }
}
