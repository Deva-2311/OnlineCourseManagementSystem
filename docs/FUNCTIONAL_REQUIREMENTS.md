# Functional Requirements

## 1. User Authentication & Management
- The system shall allow users to register and authenticate using email and password.
- The system shall manage distinct user roles (Student, Instructor, Admin).
- The system shall maintain extended user profiles based on their roles.

## 2. Course Management
- Instructors shall be able to create drafts of courses.
- Courses shall be structured hierarchically with categories, sections, and individual lessons.
- Courses shall support optional prerequisites.
- Instructors shall be able to upload media content (video, text, pdf) for lessons.

## 3. Approval Workflow
- Instructors shall submit completed course drafts for review.
- Admins shall review and either approve or reject submitted courses.
- Only approved courses shall be published and visible to students for enrollment.

## 4. Enrollment & Payment
- Students shall be able to enroll in published courses.
- For paid courses, the system shall integrate with Stripe to process checkout.
- Enrollments shall only be activated upon successful payment verification via webhooks.

## 5. Learning & Progress Tracking
- Students shall be able to mark individual lessons as complete.
- The system shall calculate and display overall course progress percentages.
- Students shall take quizzes; the system shall auto-grade and record attempt scores.

## 6. Certification
- The system shall automatically generate a certificate upon 100% course completion and passing required assessments.
- Certificates shall possess a unique verifiable ID for external validation.

## 7. Reviews & Ratings
- Students who have enrolled in a course can leave a rating (1-5 stars) and a textual review.
- The system shall calculate and display the average rating for each course.
