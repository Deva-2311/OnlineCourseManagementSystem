import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1728740000000 implements MigrationInterface {
  name = 'CreateNotificationsTable1728740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification type enum
    await queryRunner.query(`
      CREATE TYPE "public"."notification_type_enum" AS ENUM (
        'ENROLLMENT_CONFIRMED',
        'ENROLLMENT_PENDING_PAYMENT',
        'PAYMENT_SUCCEEDED',
        'PAYMENT_FAILED',
        'COURSE_APPROVED',
        'COURSE_REJECTED',
        'QUIZ_SUBMITTED',
        'QUIZ_PASSED',
        'QUIZ_FAILED',
        'CERTIFICATE_ISSUED',
        'SYSTEM_ANNOUNCEMENT'
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      UUID NOT NULL,
        "type"        "public"."notification_type_enum" NOT NULL,
        "title"       VARCHAR(255) NOT NULL,
        "message"     TEXT NOT NULL,
        "actionUrl"   VARCHAR(500),
        "metadata"    JSONB,
        "isRead"      BOOLEAN NOT NULL DEFAULT false,
        "readAt"      TIMESTAMP WITH TIME ZONE,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("userId", "isRead")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_isRead"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_userId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_userId"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
  }
}
