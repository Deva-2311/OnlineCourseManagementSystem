# Security Plan

## 1. Authentication
- **JWT (JSON Web Tokens)**: Will be used for stateless API authentication. Tokens will be issued upon successful login, have a defined expiration time, and be signed with a strong cryptographic secret.
- **Password Hashing**: Plaintext passwords will never be stored. Passwords will be hashed using the Argon2 algorithm via NestJS interceptors before insertion into the PostgreSQL database.

## 2. Authorization (RBAC)
- **Role-Based Guards**: NestJS Custom Guards (e.g., `@Roles('ADMIN', 'INSTRUCTOR')`) will be applied to controller routes to strictly enforce access control matrix rules.
- **Resource-Level Ownership**: Controllers will enforce ownership. For example:
  - Instructors can only mutate courses where `course.instructor_id === current_user.id`.
  - Students can only access lesson content if an active `Enrollment` exists for their `user_id`.

## 3. Data Protection & API Security
- **Input Validation**: `class-validator` on the backend and `zod` on the frontend will strictly validate, type-check, and sanitize all incoming payloads to prevent SQL Injection and malformed data.
- **CORS**: NestJS Cross-Origin Resource Sharing will be configured to accept requests exclusively from the designated Next.js frontend domains.
- **Environment Management**: API keys, database credentials, and JWT secrets will be managed strictly via `.env` files and securely injected during deployment. They will never be committed to source control.

## 4. Payment Security
- **Stripe Integration**: The system will utilize Stripe Elements/Checkout. No sensitive PCI data (credit card numbers) will ever touch or be stored in the NestJS backend or PostgreSQL database.
- **Webhook Verification**: All incoming Stripe webhook events will have their cryptographic signatures verified to prevent spoofed payment confirmations.
