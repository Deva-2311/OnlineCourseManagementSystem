import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollmentsTable1728670000000 implements MigrationInterface {
  name = 'CreateEnrollmentsTable1728670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enrollment status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status_enum') THEN
          CREATE TYPE "enrollment_status_enum" AS ENUM('ACTIVE', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED');
        END IF;
      END$$;
    `);

    // 2. Enrollments table with foreign keys and unique constraint
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "status" "enrollment_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "enrolledAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_enrollment_student_course" UNIQUE ("studentId", "courseId"),
        CONSTRAINT "FK_enrollment_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enrollment_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT
      );
    `);

    // 3. Indexes for efficient lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enrollments_studentId" ON "enrollments" ("studentId");
      CREATE INDEX IF NOT EXISTS "IDX_enrollments_courseId" ON "enrollments" ("courseId");
      CREATE INDEX IF NOT EXISTS "IDX_enrollments_status" ON "enrollments" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_courseId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_studentId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollments";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "enrollment_status_enum";`);
  }
}
