# Online Course Management System (OCMS)

An enterprise-grade, full-stack Online Course Management System engineered with Next.js 16, NestJS 12, PostgreSQL 16, and Stripe payment processing. OCMS provides a complete digital learning platform with role-based access for students, instructors, and university administrators.

---

## 1. Project Overview & Architecture

OCMS functions as a unified learning management platform supporting course authoring, academic governance, verified enrollment, interactive multimedia lessons, server-graded quizzes, automated certificate generation, skill-gap analysis, and immutable audit logs.

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│ Next.js 16 Web Application      │        │ NestJS 12 API Service           │
│ (React, Tailwind CSS, Lucide)   │ <────> │ (TypeORM, Passport JWT, Stripe) │
│ http://localhost:3000           │        │ http://localhost:3001/api/v1    │
└─────────────────────────────────┘        └─────────────────────────────────┘
                                                           │
                                                           ▼
                                           ┌─────────────────────────────────┐
                                           │ PostgreSQL 16 Database          │
                                           │ (20 Tables, Strict Foreign Keys)│
                                           └─────────────────────────────────┘
```

---

## 2. Key Features

- **Role-Based Access Control (RBAC):** Dedicated workflows and route protections for `STUDENT`, `INSTRUCTOR`, and `ADMIN` users.
- **Authentication & Security:** Argon2 password hashing, short-lived JWT access tokens with rotating refresh tokens, rate limiting, and CSRF/cookie isolation.
- **Course Discovery & Catalog:** Real-time catalog search, difficulty levels, academic disciplines, tuition filtering, and pagination.
- **Curriculum & Interactive Learning:** Multi-section syllabus with protected video iframes, markdown reading content, and external learning resources.
- **Stripe Payment Engine:** Secure checkout session initiation, webhook signature verification with raw body buffering, and idempotent enrollment activation.
- **Server-Graded Quizzes:** Timed quiz attempts, multiple-choice questions, server-calculated scoring, and attempt history.
- **Verifiable Certificates:** Cryptographically generated unique certificate identifiers, server-side eligibility checks, PDF blob generation, and public verification lookup.
- **AI-Powered Learning Insights:** Personalized course recommendations, skill-gap analysis, and adaptive next-step paths.
- **Academic Governance & Moderation:** Registrar queue for approving or rejecting course proposals with mandatory instructor feedback.
- **Analytics & Auditing:** Comprehensive student progress summaries, faculty course metrics, platform revenue reports, and immutable audit logs with CSV export.

---

## 3. Technology Stack

- **Frontend:** Next.js 16 (App Router, Turbopack, React 19, Server & Client Components), Tailwind CSS, Lucide Icons.
- **Backend:** NestJS 12, Express with `rawBody`, TypeORM, PostgreSQL Driver (`pg`), Passport JWT, Argon2.
- **Database:** PostgreSQL 16 with 20 public relational tables and TypeORM migrations.
- **Payments:** Stripe SDK (`stripe`), Stripe Checkout, and Stripe Webhook Processing.
- **Document Generation:** PDFKit (`pdfkit`) for on-the-fly certificate PDF issuance.
- **Testing:** Jest, Supertest, VM modules for ESM compatibility.

---

## 4. Prerequisites

- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x or higher
- **PostgreSQL:** v15 or v16 running locally or in Docker
- **Stripe Account:** Test mode API keys (`sk_test_...`, `pk_test_...`)

---

## 5. Local Development Setup

### Step 1: Clone Repository & Install Dependencies
```bash
git clone <repository_url>
cd OCMS

# Install root, backend, and frontend dependencies
npm install
npm run --prefix backend install
npm run --prefix frontend install
```

### Step 2: Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
# Verify or edit database credentials and secret keys
```

**Frontend (`frontend/.env.local`):**
```bash
cp frontend/.env.example frontend/.env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Step 3: Database Migrations & Initial Admin Seed
```bash
# Apply all TypeORM migrations
npm run migration:run

# Seed initial system administrator account
ADMIN_EMAIL=admin@ocms.com ADMIN_PASSWORD="AdminSecurePass123!" npm run seed:admin
```

### Step 4: Run the Application Locally

You can launch both the **NestJS Backend** and **Next.js Frontend** concurrently with a single command from the project root:

```bash
npm run dev
```

*(Alternatively, run `./start.sh`)*

- **Frontend (Web Application):** [http://localhost:3000](http://localhost:3000)
- **Backend (API Service):** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- **API Swagger Documentation:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

*To run them in separate terminals if preferred:*
- Terminal 1: `npm run dev:backend`
- Terminal 2: `npm run dev:frontend`

---

## 6. Testing & Quality Assurance

```bash
# Run all 28 Backend Unit Test Suites (258 unit tests)
npm run test:backend

# Run all 11 Backend End-to-End Test Suites (167 E2E tests)
npm run test:e2e

# Run Frontend Production Build
npm run --prefix frontend build

# Run Backend Production Build
npm run --prefix backend build
```

---

## 7. API Documentation

When the backend is running in development mode:
- **Interactive Swagger UI:** Visit [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **Health Check Probe:** Visit [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

---

## 8. Production Deployment

Refer to [DEPLOYMENT.md](file:///home/devprasath/Deva/KRCE/Sem_V/OOAD/Project/OCMS/DEPLOYMENT.md) for:
- Containerized deployment with `docker-compose.prod.yml`
- Cloud deployment on Vercel (Frontend) and Railway / Render (Backend)
- Production database backup and migration procedures
- Stripe live webhook registration

---

## 9. Known Limitations

- **Email Delivery:** Relies on external SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`). In development without SMTP configured, email dispatch errors are logged non-fatally without blocking transactions.
- **Stripe Live Charges:** Payment workflow is fully tested with Stripe Test Mode keys (`sk_test_...`). Live credit card transactions require production Stripe account activation.
# OnlineCourseManagementSystem
