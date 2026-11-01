import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSectionsAndLessonsTables1728690000000 implements MigrationInterface {
  name = 'CreateSectionsAndLessonsTables1728690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Lesson content type enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_content_type_enum') THEN
          CREATE TYPE "lesson_content_type_enum" AS ENUM('VIDEO', 'TEXT', 'PDF');
        END IF;
      END$$;
    `);

    // 2. Course Sections table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "course_sections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "courseId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_sections_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_course_sections_displayOrder" CHECK ("displayOrder" >= 0),
        CONSTRAINT "FK_course_sections_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
      );
    `);

    // 3. Lessons table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lessons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sectionId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "contentType" "lesson_content_type_enum" NOT NULL DEFAULT 'VIDEO',
        "textContent" text,
        "videoUrl" character varying(1000),
        "contentUrl" character varying(1000),
        "estimatedDuration" integer NOT NULL DEFAULT 0,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isPreview" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lessons_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_lessons_displayOrder" CHECK ("displayOrder" >= 0),
        CONSTRAINT "CHK_lessons_estimatedDuration" CHECK ("estimatedDuration" >= 0),
        CONSTRAINT "FK_lessons_section" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE CASCADE
      );
    `);

    // 4. Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_sections_courseId" ON "course_sections" ("courseId");
      CREATE INDEX IF NOT EXISTS "IDX_course_sections_displayOrder" ON "course_sections" ("displayOrder");
      CREATE INDEX IF NOT EXISTS "IDX_lessons_sectionId" ON "lessons" ("sectionId");
      CREATE INDEX IF NOT EXISTS "IDX_lessons_displayOrder" ON "lessons" ("displayOrder");
      CREATE INDEX IF NOT EXISTS "IDX_lessons_isPreview" ON "lessons" ("isPreview");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lessons_isPreview";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lessons_displayOrder";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lessons_sectionId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_sections_displayOrder";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_sections_courseId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lessons";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_sections";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lesson_content_type_enum";`);
  }
}
