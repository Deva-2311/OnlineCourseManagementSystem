# Non-Functional Requirements

## 1. Performance & Scalability
- The backend API should respond within 200ms for standard database queries.
- The system must support concurrent media streaming and downloading, ideally offloaded to a CDN.
- The database schema must be normalized to support efficient querying using TypeORM over PostgreSQL.

## 2. Security
- User passwords must be securely hashed using Argon2.
- APIs must be secured using stateless JSON Web Tokens (JWT).
- The frontend and backend must implement Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) protections.
- Payment processing must be PCI compliant by offloading all sensitive card handling to Stripe Checkout.

## 3. Reliability & Availability
- The system architecture should be designed for high availability using cloud infrastructure.
- Payment webhook endpoints must incorporate retry mechanisms and idempotent processing to prevent duplicate transactions.

## 4. Usability & Accessibility
- The frontend (Next.js) must be fully responsive and functional across desktop, tablet, and mobile devices.
- UI components (shadcn/ui) should adhere to standard ARIA accessibility guidelines.

## 5. Extensibility & Modularity (OOAD Focus)
- The architecture must be highly modular to seamlessly accommodate future unique features (e.g., Skill-gap analysis, Adaptive learning paths) without massive refactoring.
- The backend must maintain a strict separation of concerns among Controllers, Services, and Repositories within the NestJS framework.
