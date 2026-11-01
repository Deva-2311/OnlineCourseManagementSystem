import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCertificatesTable1728720000000 implements MigrationInterface {
  name = 'CreateCertificatesTable1728720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type for certificate status
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status_enum') THEN
          CREATE TYPE "certificate_status_enum" AS ENUM('ACTIVE', 'REVOKED');
        END IF;
      END$$;
    `);

    // 2. Create certificates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certificates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "certificateNumber" character varying(100) NOT NULL,
        "studentId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "enrollmentId" uuid NOT NULL,
        "status" "certificate_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "revocationReason" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_certificates_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_certificates_certificateNumber" UNIQUE ("certificateNumber"),
        CONSTRAINT "UQ_certificates_enrollment" UNIQUE ("enrollmentId"),
        CONSTRAINT "FK_certificates_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_certificates_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_certificates_enrollment" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_certificates_certificateNumber" ON "certificates" ("certificateNumber");
      CREATE INDEX IF NOT EXISTS "IDX_certificates_studentId" ON "certificates" ("studentId");
      CREATE INDEX IF NOT EXISTS "IDX_certificates_courseId" ON "certificates" ("courseId");
      CREATE INDEX IF NOT EXISTS "IDX_certificates_enrollmentId" ON "certificates" ("enrollmentId");
      CREATE INDEX IF NOT EXISTS "IDX_certificates_status" ON "certificates" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_certificates_student_course" ON "certificates" ("studentId", "courseId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_student_course";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_enrollmentId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_courseId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_studentId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certificates_certificateNumber";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "certificate_status_enum";`);
  }
}
