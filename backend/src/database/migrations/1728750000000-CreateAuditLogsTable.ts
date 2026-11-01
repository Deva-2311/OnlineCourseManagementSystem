import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1728750000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1728750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"           UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "actorId"      UUID             NULL,
        "actorRole"    VARCHAR(50)      NULL,
        "actorEmail"   VARCHAR(255)     NULL,
        "action"       VARCHAR(100) NOT NULL,
        "resourceType" VARCHAR(50)      NULL,
        "resourceId"   UUID             NULL,
        "outcome"      VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
        "metadata"     JSONB            NULL,
        "ipAddress"    VARCHAR(45)      NULL,
        "userAgent"    TEXT             NULL,
        "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actor"
          FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Covering indexes for common admin filter patterns
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actorId_createdAt"   ON "audit_logs" ("actorId",      "createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action_createdAt"    ON "audit_logs" ("action",       "createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_resourceType_id"     ON "audit_logs" ("resourceType", "resourceId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt"           ON "audit_logs" ("createdAt" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_resourceType_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_actorId_createdAt"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
