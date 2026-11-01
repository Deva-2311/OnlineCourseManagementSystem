# Online Course Management System (OCMS) — Production Deployment Guide

This guide details the complete production deployment procedures, environment configurations, database migration protocols, Stripe webhook integration, and disaster recovery plans for OCMS.

---

## 1. Hosting Architecture Overview

OCMS is designed as a decoupled, multi-tier system:

```
[ Client Browsers ]
       │ HTTPS
       ▼
┌─────────────────────────────────┐
│ Next.js 16 Web Frontend         │  (Vercel / AWS Amplify / Standalone Docker)
│ Port: 3000                      │
└─────────────────────────────────┘
       │ HTTPS REST API
       ▼
┌─────────────────────────────────┐
│ NestJS 12 Application Backend   │  (Render / Railway / AWS ECS / Fly.io)
│ Port: 3001 | Prefix: /api/v1    │
└─────────────────────────────────┘
       │ TLS TCP Connection
       ▼
┌─────────────────────────────────┐
│ PostgreSQL 16 Database          │  (AWS RDS / Supabase / Neon / Self-hosted)
│ Port: 5432                      │
└─────────────────────────────────┘
```

---

## 2. Environment Variables Matrix

### Backend Environment (`backend/.env`)

| Variable Name | Required | Example / Placeholder Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations & secure errors |
| `PORT` | **Yes** | `3001` | Server listening port |
| `API_PREFIX` | **Yes** | `/api/v1` | Global API route prefix |
| `FRONTEND_URL` | **Yes** | `https://your-frontend-domain.com` | Allowed CORS origin for browser requests |
| `DATABASE_URL` | **Yes** | `postgres://user:pass@host:5432/ocms?sslmode=require` | PostgreSQL connection string with TLS |
| `SWAGGER_ENABLED` | No | `false` | Disable public Swagger UI in production |
| `SWAGGER_PATH` | No | `/api-docs` | Path for Swagger documentation |
| `JWT_ACCESS_SECRET` | **Yes** | `[generate-random-base64-32-chars-minimum]` | Symmetric key for access token signing |
| `JWT_ACCESS_EXPIRATION`| No | `15m` | Access token lifespan (recommended 15 mins) |
| `JWT_REFRESH_SECRET` | **Yes** | `[generate-random-base64-32-chars-minimum]` | Symmetric key for refresh token signing |
| `JWT_REFRESH_EXPIRATION`| No | `7d` | Refresh token lifespan (recommended 7 days) |
| `THROTTLE_TTL` | No | `60` | Rate limiter time window (seconds) |
| `THROTTLE_LIMIT` | No | `50` | Maximum requests permitted per window |
| `STRIPE_SECRET_KEY` | **Yes** | `sk_test_...` or `sk_live_...` | Stripe private key (server-side ONLY) |
| `STRIPE_PUBLISHABLE_KEY`| No | `pk_test_...` or `pk_live_...` | Public Stripe key reference |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | `whsec_...` | Webhook signature verification secret |
| `STRIPE_SUCCESS_URL` | **Yes** | `https://your-domain.com/student/enrollments?payment=success&session_id={CHECKOUT_SESSION_ID}` | Post-payment redirect URL |
| `STRIPE_CANCEL_URL` | **Yes** | `https://your-domain.com/courses/{COURSE_ID}?payment=cancelled` | Payment cancellation redirect URL |
| `STRIPE_CURRENCY` | No | `usd` | Standard transaction currency |
| `SMTP_HOST` | No | `smtp.sendgrid.net` | Outgoing SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | No | `apikey` | SMTP username |
| `SMTP_PASS` | No | `your_smtp_api_key` | SMTP password / API token |
| `EMAIL_FROM` | No | `noreply@your-domain.com` | Verified sender email address |

### Frontend Environment (`frontend/.env.local` or Hosting Dashboard)

| Variable Name | Required | Example / Placeholder Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://api.your-domain.com/api/v1` | Public backend API URL accessed by client browser |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Yes** | `pk_test_...` or `pk_live_...` | Public Stripe publishable key |

> [!CAUTION]
> Never place `STRIPE_SECRET_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `DATABASE_URL` into frontend environment files.

---

## 3. Database Migration and Backup Procedures

### Migration Safety Rules
- Schema synchronization (`synchronize: true`) is **strictly disabled** in `data-source.ts`.
- Schema changes are executed exclusively via immutable TypeORM migrations.
- Always back up the database before running migrations in production.

### Database Backup (Pre-deployment)
```bash
# Export full database dump with schema and data
pg_dump -h <DB_HOST> -p 5432 -U <DB_USER> -d <DB_NAME> -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup file size
ls -lh backup_*.dump
```

### Applying Migrations
```bash
# In the backend directory
npm run migration:run
```

### Administrator Provisioning
```bash
# Provision or verify the initial system administrator account safely
ADMIN_EMAIL="admin@your-domain.com" ADMIN_PASSWORD="SecureProductionPassword123!" npm run seed:admin
```

---

## 4. Stripe Webhook Configuration

1. In the **Stripe Dashboard** (or via Stripe CLI for staging):
   - Navigate to **Developers** &rarr; **Webhooks** &rarr; **Add endpoint**.
   - Endpoint URL: `https://api.your-domain.com/api/v1/payments/webhook`
   - Select events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
2. Obtain the **Signing secret** (`whsec_...`).
3. Set `STRIPE_WEBHOOK_SECRET=whsec_...` in your backend environment variables.
4. Verify that the backend receives raw request body buffers (already configured in `main.ts` with `{ rawBody: true }`).

---

## 5. Deployment Options

### Option A: Managed PaaS (Railway / Render + Vercel)
1. **Database:** Deploy PostgreSQL 16 on Neon, Supabase, or AWS RDS.
2. **Backend (Render / Railway):**
   - Root directory: `backend`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start:prod`
   - Health Check Path: `/api/v1/health`
3. **Frontend (Vercel):**
   - Root directory: `frontend`
   - Framework preset: `Next.js`
   - Environment variables: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Build command: `npm run build`

### Option B: Unified Containerized Deployment (Docker Compose)
```bash
# 1. Clone repository on production server
git clone <repository_url>
cd OCMS

# 2. Configure environment file
cp backend/.env.example .env
# Edit .env with production credentials

# 3. Build and launch container stack
docker compose -f docker-compose.prod.yml up -d --build

# 4. Apply database migrations inside container
docker compose -f docker-compose.prod.yml exec backend npm run migration:run

# 5. Check health check status
curl -i http://localhost:3001/api/v1/health
```

---

## 6. Pre-Flight Production Smoke Test Checklist

- [ ] HTTPS is active with a valid SSL/TLS certificate on both frontend and backend.
- [ ] Backend health endpoint (`GET /api/v1/health`) returns `{"status":"ok"}`.
- [ ] CORS is restricted to the frontend production origin (`FRONTEND_URL`).
- [ ] Registration with a test student account succeeds.
- [ ] Public course catalog loads live courses without browser console errors.
- [ ] Free course enrollment transitions immediately to course learning content.
- [ ] Paid course initiates Stripe checkout without exposing client-side pricing or secrets.
- [ ] Stripe test webhook triggers and activates enrollment idempotently.
- [ ] Lesson video, markdown reading, and completion tracking function properly.
- [ ] Quiz submission calculates scores server-side and updates attempt history.
- [ ] Certificate generation issues valid PDF blob upon 100% course completion.
- [ ] Public certificate verification (`/verify/[certificateNumber]`) validates authentic credentials.
- [ ] Instructor dashboard supports course authoring and submission for moderation.
- [ ] Admin dashboard allows reviewing pending proposals, approving/rejecting with feedback, and auditing user accounts.
- [ ] Server logs confirm that passwords, JWT tokens, and full card details are never written.

---

## 7. Rollback & Disaster Recovery Plan

If a deployment failure or critical regression occurs:

1. **Frontend Rollback:**
   - In Vercel / hosting dashboard: Instant rollback to previous production deployment.
   - Or revert Docker image tag to previous build.
2. **Backend Rollback:**
   - Re-deploy previous git commit or container image.
3. **Database Rollback:**
   - If migrations caused data corruption, restore from pre-deployment backup:
     ```bash
     pg_restore -h <DB_HOST> -p 5432 -U <DB_USER> -d <DB_NAME> -c -v backup_<timestamp>.dump
     ```
