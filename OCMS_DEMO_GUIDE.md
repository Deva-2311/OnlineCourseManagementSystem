# OCMS — College Project Demonstration Guide

**Project:** Online Course Management System (OCMS)  
**Date:** October 30, 2026  
**Audience:** Academic Evaluators, Faculty Reviewers, Project Demonstrators  

---

## 1. Quick Startup Commands

Launch the application using these simple, non-destructive commands from the project root:

```bash
# Step 1: Ensure database schema is synchronized
npm run migration:run

# Step 2: Provision demo credentials and featured curriculum
npm run seed:demo

# Step 3: Launch both Backend and Frontend concurrently
npm run dev
```

- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- **Swagger Documentation:** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

---

## 2. Verified Demo Accounts

| Role | Email Address | Password | Intended Portal |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@ocms.com` | `AdminSecurePass123!` | `/admin` (Course Queue & Analytics) |
| **Faculty Instructor** | `instructor@ocms.com`| `InstructorSecurePass123!`| `/instructor` (Course Studio) |
| **Enrolled Student** | `student@ocms.com` | `StudentSecurePass123!` | `/student` (Learning Workspace) |

---

## 3. Step-by-Step Demonstration Walkthrough

### Part 1: Public Discovery & Academic Catalog (2 minutes)
1. Open [http://localhost:3000](http://localhost:3000) in your web browser.
2. Show the university landing page, featured categories, stats counter, and search bar.
3. Click **Browse Courses** ([http://localhost:3000/courses](http://localhost:3000/courses)) to demonstrate text search, category filters, and difficulty level filtering.

### Part 2: Student Learning Journey & Certification (4 minutes)
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login) and log in as `student@ocms.com` / `StudentSecurePass123!`.
2. Browse to the featured demo course: **Full-Stack Modern Web Engineering**.
3. Show the course syllabus with sections, video/reading badges, and preview permissions.
4. Click **Enroll in Course** (instant enrollment for free course).
5. Open the curriculum:
   - Click **Lesson 1** (Introduction to Full-Stack Architecture), read content, and click **Mark Complete**.
   - Click **Lesson 2** (Component Architecture Assessment) and click **Mark Complete**.
6. Observe the progress bar advance to **100% Completed**.
7. Click **Take Assessment / Quiz**:
   - Answer Question 1: Select `HTTP / HTTPS REST`.
   - Answer Question 2: Select `Argon2`.
   - Click **Submit Quiz**.
   - Show server-side auto-graded score of **100% (Passed)**.
8. Navigate to **Certificates** ([http://localhost:3000/student/certificates](http://localhost:3000/student/certificates)):
   - View the issued credential with unique certificate number (e.g., `OCMS-CERT-MVV6PBWJ-KV9AY`).
   - Click **Download Certificate** to demonstrate the dynamically generated vector PDF document.
   - Click **Verify** to open the public verification screen ([http://localhost:3000/verify](http://localhost:3000/verify)).
9. Open **Learning Summary** ([http://localhost:3000/student/learning-summary](http://localhost:3000/student/learning-summary)):
   - Show live analytics: 1 Enrolled Course, 100% Progress, 2 Completed Lessons, 100% Quiz Pass Rate, and 1 Verified Certificate.

### Part 3: Instructor Course Management (3 minutes)
1. Log out or open a private window and log in as `instructor@ocms.com` / `InstructorSecurePass123!`.
2. Access the **Instructor Dashboard** ([http://localhost:3000/instructor](http://localhost:3000/instructor)).
3. Click **Create New Course**:
   - Input title, description, category, and price.
   - Save as draft.
4. Add a curriculum section and lesson.
5. Click **Submit for Review** to push the course into the moderation queue.

### Part 4: Administrator Moderation & Platform Analytics (3 minutes)
1. Log in as `admin@ocms.com` / `AdminSecurePass123!`.
2. Access the **Moderation Queue** ([http://localhost:3000/admin](http://localhost:3000/admin)):
   - Review pending course proposals submitted by instructors.
   - Demonstrate the approval and rejection workflows (with mandatory constructive feedback).
3. Open **Platform Analytics** ([http://localhost:3000/admin/analytics](http://localhost:3000/admin/analytics)):
   - Show platform-wide metrics: total enrollments, revenue breakdown, and user registration trends.
4. Open **Audit Logs** ([http://localhost:3000/admin/audit-logs](http://localhost:3000/admin/audit-logs)):
   - Review immutable chronological logs of administrative and moderation actions.

---

## 4. Key Architectural Highlights to Mention in Defense

- **Object-Oriented Design (OOAD):** Modular domain architecture adhering to SOLID design principles across 16 cohesive NestJS modules.
- **Enterprise Security:** Argon2 memory-hard password hashing, dual-token JWT authentication with token rotation, and strict RBAC guards.
- **Robust Persistence:** TypeORM with PostgreSQL, ACID transaction safety, foreign key cascading integrity, and parameterized query builders preventing SQL injection.
- **Resilient Frontend:** Next.js 16.4 App Router with single-attempt automated token refresh, open-redirect protection, and graceful error recovery.
