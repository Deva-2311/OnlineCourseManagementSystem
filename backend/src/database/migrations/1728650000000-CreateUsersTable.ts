import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1728650000000 implements MigrationInterface {
  name = 'CreateUsersTable1728650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create enum types if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM('STUDENT', 'INSTRUCTOR', 'ADMIN');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          CREATE TYPE "users_status_enum" AS ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE');
        END IF;
      END$$;
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying(150) NOT NULL,
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'STUDENT',
        "status" "users_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "hashedRefreshToken" character varying(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);

    // Unique index for normalized lower-case email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_lower" ON "users" (LOWER("email"));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_lower";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
