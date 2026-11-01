import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesAndCoursesTables1728660000000 implements MigrationInterface {
  name = 'CreateCategoriesAndCoursesTables1728660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enums
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_status_enum') THEN
          CREATE TYPE "course_status_enum" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level_enum') THEN
          CREATE TYPE "difficulty_level_enum" AS ENUM('Beginner', 'Intermediate', 'Advanced');
        END IF;
      END$$;
    `);

    // 2. Categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
      );
    `);

    // 3. Courses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "slug" character varying(300) NOT NULL,
        "shortDescription" character varying(500),
        "description" text NOT NULL,
        "thumbnailUrl" character varying(500),
        "instructorId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "difficultyLevel" "difficulty_level_enum" NOT NULL DEFAULT 'Beginner',
        "estimatedDuration" integer NOT NULL DEFAULT 0,
        "price" numeric(10,2) NOT NULL DEFAULT 0.00,
        "currency" character varying(10) NOT NULL DEFAULT 'USD',
        "prerequisites" jsonb NOT NULL DEFAULT '[]',
        "learningOutcomes" jsonb NOT NULL DEFAULT '[]',
        "status" "course_status_enum" NOT NULL DEFAULT 'DRAFT',
        "rejectionReason" text,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_courses_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_courses_instructor" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_courses_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT
      );
    `);

    // 4. Indexes for filtering, search, and foreign keys
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_courses_status" ON "courses" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_courses_instructorId" ON "courses" ("instructorId");
      CREATE INDEX IF NOT EXISTS "IDX_courses_categoryId" ON "courses" ("categoryId");
      CREATE INDEX IF NOT EXISTS "IDX_courses_price" ON "courses" ("price");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_price";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_categoryId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_instructorId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_status";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "difficulty_level_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "course_status_enum";`);
  }
}
