import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/enums/user-role.enum';

describe('Authentication & RBAC (e2e)', () => {
  let app: INestApplication;
  const testEmail = `e2e_student_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let studentAccessToken: string;
  let studentRefreshToken: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject invalid registration data (empty fields, bad email)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject attempts to assign ADMIN role through public registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Hacker Admin',
          email: `hacker_${Date.now()}@example.com`,
          password: testPassword,
          role: 'ADMIN',
        })
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('ADMIN');
    });

    it('should successfully register a student with default STUDENT role and safe profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'E2E Student',
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body.email).toBe(testEmail.toLowerCase());
      expect(res.body.role).toBe(UserRole.STUDENT);
      expect(res.body.id).toBeDefined();
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.hashedRefreshToken).toBeUndefined();
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate Student',
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject incorrect password with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword999!',
        })
        .expect(401);
    });

    it('should reject unknown email with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent_account@example.com',
          password: testPassword,
        })
        .expect(401);
    });

    it('should successfully authenticate student and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(testEmail.toLowerCase());

      studentAccessToken = res.body.accessToken;
      studentRefreshToken = res.body.refreshToken;

      // Verify cookie is set
      const cookies = (res.headers['set-cookie'] as unknown) as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refresh_token='))).toBe(true);
    });

    it('should successfully authenticate seeded admin user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@ocms.com',
          password: 'AdminSecurePass123!',
        })
        .expect(200);

      expect(res.body.user.role).toBe(UserRole.ADMIN);
      adminAccessToken = res.body.accessToken;
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should reject invalid or malformed bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(401);
    });

    it('should return safe user profile when access token is valid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail.toLowerCase());
      expect(res.body.role).toBe(UserRole.STUDENT);
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens when valid refresh token is supplied in body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: studentRefreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toEqual(studentRefreshToken);

      studentAccessToken = res.body.accessToken;
      studentRefreshToken = res.body.refreshToken;
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow public access to /api/v1/test-rbac/public without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/public')
        .expect(200);

      expect(res.body.message).toContain('Public');
    });

    it('should allow student access to student-only endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/student')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Student access granted');
    });

    it('should deny student access to admin-only endpoint with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/test-rbac/admin')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .expect(403);
    });

    it('should deny unauthenticated user access to admin-only endpoint with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/test-rbac/admin').expect(401);
    });

    it('should allow admin access to admin-only endpoint with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-rbac/admin')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Admin access granted');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should invalidate refresh token session and clear refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .expect(200);

      expect(res.body.message).toContain('Logged out');

      // Subsequent refresh attempt with the old token should be rejected (revoked!)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: studentRefreshToken })
        .expect(401);
    });
  });
});
