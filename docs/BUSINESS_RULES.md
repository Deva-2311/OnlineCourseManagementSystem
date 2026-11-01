# Business Rules

## 1. Course Lifecycle Workflow
1. **Draft**: An instructor creates a course. It remains visible only to them.
2. **Submitted**: The instructor submits the finished draft for review.
3. **In Review**: An admin reviews the course content for quality and policy adherence.
4. **Approved / Rejected**: The admin makes a decision. If rejected, the course returns to Draft status with feedback.
5. **Published**: Approved courses are published and appear in the student course catalog.
6. **Enrollment**: Students discover the course, pass prerequisite checks (future), and enroll.
7. **Learning**: Students study the material and take assessments.
8. **Completion**: A student completes all requirements and receives a certificate.

## 2. Payment Lifecycle Workflow
1. A student selects a paid course and initiates the enrollment process.
2. The system creates a "Pending" order/enrollment record.
3. The student is redirected to the Stripe Checkout page.
4. The student completes the payment securely on Stripe.
5. Stripe sends an asynchronous webhook event to the backend.
6. The backend verifies the webhook signature and updates the payment record status.
7. The enrollment status transitions to "Active", granting course access.

## 3. Role-Based Access Control (RBAC) Matrix

| Action \ Role | Student | Instructor | Admin |
| :--- | :---: | :---: | :---: |
| Browse Published Courses | Yes | Yes | Yes |
| Enroll in Courses | Yes | No | No |
| Access Enrolled Courses | Yes | No | No |
| Create/Edit Own Course | No | Yes | No |
| View Own Students' Progress| No | Yes | No |
| Approve/Reject Courses | No | No | Yes |
| Manage Categories | No | No | Yes |
| Manage All Users | No | No | Yes |
