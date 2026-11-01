import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1728680000000 implements MigrationInterface {
  name = 'CreatePaymentsTable1728680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Payment status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
          CREATE TYPE "payment_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
        END IF;
      END$$;
    `);

    // 2. Payments table with foreign keys (SET NULL so financial records are never accidentally deleted)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId" uuid,
        "courseId" uuid,
        "enrollmentId" uuid,
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'USD',
        "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "stripeCheckoutSessionId" character varying(255),
        "stripePaymentIntentId" character varying(255),
        "metadata" jsonb,
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_stripeCheckoutSessionId" UNIQUE ("stripeCheckoutSessionId"),
        CONSTRAINT "FK_payments_student" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payments_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payments_enrollment" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL
      );
    `);

    // 3. Indexes for efficient lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_studentId" ON "payments" ("studentId");
      CREATE INDEX IF NOT EXISTS "IDX_payments_courseId" ON "payments" ("courseId");
      CREATE INDEX IF NOT EXISTS "IDX_payments_enrollmentId" ON "payments" ("enrollmentId");
      CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_payments_stripePaymentIntentId" ON "payments" ("stripePaymentIntentId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_stripePaymentIntentId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_enrollmentId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_courseId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_studentId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
  }
}
