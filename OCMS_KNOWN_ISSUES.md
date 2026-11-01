# OCMS — Known Issues & External Service Limitations

**Project:** Online Course Management System (OCMS)  
**Date:** October 30, 2026  
**Status:** Documented  

---

## 1. External Service Limitations

### 1.1 Stripe Payments (Test Mode Only)
- **Status:** Functional in test simulation; live production payments not configured.
- **Details:** The Stripe integration verifies webhook signatures, enforces price authority on the server, and grants enrollment upon payment success. In local testing without an active `stripe listen` daemon or live Stripe keys, paid course checkouts remain in `PENDING_PAYMENT` status until the webhook is received.
- **Recommendation for Demo:** Use free courses (`price: 0`) for the live presentation walkthrough, or trigger simulated webhooks via curl as documented in `DEPLOYMENT.md`.

### 1.2 SMTP Email Delivery
- **Status:** Graceful fallback active.
- **Details:** The email notification service handles failed connections gracefully without crashing the application. Live email delivery requires valid credentials for `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `backend/.env`.
- **Recommendation for Demo:** In-app notifications (`/student/notifications` and `NotificationBell`) are fully functional and should be used during demonstrations.

---

## 2. Resolved Issues (Phase 2 & Phase 5)

### 2.1 ESLint React 19 `useEffect` Dependencies
- **Status:** RESOLVED
- **Details:** Refactored `LearningInsightsSection.tsx` and `RecommendedCoursesSection.tsx` to wrap data-fetching functions in `useCallback` with complete dependency arrays. The frontend passes TypeScript checks and compiles with 0 errors across all 26 static/dynamic routes.

### 2.2 Jest Unit & E2E Test Suite Execution
- **Status:** RESOLVED
- **Details:** Fixed mock definitions in `courses.service.spec.ts` (`sections`, `skills`), `enrollments.service.spec.ts` (`toPublicCourse`), and cookie type-casting in `auth.e2e-spec.ts`. Configured `npm test` and `npm run test:e2e` with `--experimental-vm-modules`. All 28 unit test suites (258 tests) and all 11 E2E test suites (183 tests) pass (100% success rate, 441 total tests).

### 2.3 PostgreSQL Analytics Query Sorting
- **Status:** RESOLVED
- **Details:** Fixed SQL alias sorting bug in `backend/src/modules/analytics/analytics.service.ts` where PostgreSQL prohibited casting aliases (`"totalEnrollments"::INT`) in `ORDER BY` when `GROUP BY` is present. Replaced with raw aggregate expression `COUNT(e.id)` and `AVG(r.rating)`.

### 2.4 Learning Summary 401 & Safe Navigation
- **Status:** RESOLVED
- **Details:** Hardened `frontend/src/lib/api.ts` with transparent single-flight token refresh and `_isRetry` recursion prevention. Added open-redirect evasion validation (`getSafeRedirect`) in `/login`. Fixed course detail link routing in `/student/learning-summary` to pass course UUID.

