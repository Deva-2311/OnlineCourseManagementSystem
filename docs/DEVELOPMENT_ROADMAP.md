# Development Roadmap & Dependency Order

The project will be developed sequentially to ensure foundational modules are stable before dependent features are introduced.

## Phase 1: Foundation & Users
1. Initialize Git repository and mono-repo/split-repo structure.
2. Setup PostgreSQL database and TypeORM configuration.
3. Scaffold NestJS backend base and Next.js frontend base.
4. Define User and Role entities.
5. Implement Authentication module (JWT, Login, Register) and RBAC Guards.

## Phase 2: Core Course Catalog
*Depends on Phase 1*
1. Define Category and Course entities.
2. Implement Admin API to manage Categories.
3. Implement Instructor API to CRUD Courses (Drafts).
4. Implement Section and Lesson entities and associated APIs.
5. Implement Course Approval workflow for Admins.
6. Build Frontend course catalog, search capabilities, and course detail pages.

## Phase 3: Enrollments & Payments
*Depends on Phase 1 & 2*
1. Define Enrollment and Payment entities.
2. Integrate Stripe Checkout for paid course purchases.
3. Implement Stripe Webhook handler in NestJS to automatically activate enrollments.
4. Build Student Dashboard for accessing purchased courses.

## Phase 4: Learning Experience & Assessments
*Depends on Phase 3*
1. Implement Progress tracking (marking lessons as complete).
2. Build Quiz, Question, and QuizAttempt entities.
3. Implement Quiz taking and auto-grading APIs.
4. Implement the interactive course player interface on the Frontend.

## Phase 5: Post-Course Activities
*Depends on Phase 4*
1. Implement Certificate generation entity and API.
2. Implement Review/Rating system for completed courses.
3. Build Analytics dashboards for Instructors and Admins.

## Phase 6: Advanced Capabilities (Future Scope)
*Depends on all previous phases*
1. Skill mapping and Student Skill assessment logic.
2. Prerequisite enforcement engine during enrollment.
3. Smart Recommendation engine based on skill gaps.
