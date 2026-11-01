# Database Plan (Entities & Relationships)

This document outlines the proposed conceptual entities for the PostgreSQL database, mapping directly to TypeORM configurations.

## 1. Users & Roles
- **User**: Base authentication entity.
  - *Attributes*: `id` (PK), `email`, `password_hash`, `role` (enum: STUDENT, INSTRUCTOR, ADMIN), `created_at`.
- **StudentProfile**: Extended metadata for students.
  - *Attributes*: `id` (PK), `user_id` (FK), `bio`, `learning_goals`.
  - *Relationship*: 1-to-1 with User.
- **InstructorProfile**: Extended metadata for instructors.
  - *Attributes*: `id` (PK), `user_id` (FK), `expertise`, `title`.
  - *Relationship*: 1-to-1 with User.

## 2. Course Management
- **Category**: Grouping mechanism for courses.
  - *Attributes*: `id` (PK), `name`, `description`, `slug`.
- **Course**: The primary educational product.
  - *Attributes*: `id` (PK), `instructor_id` (FK), `category_id` (FK), `title`, `description`, `price`, `status` (DRAFT, PENDING, APPROVED, PUBLISHED).
  - *Relationships*: Many-to-1 to InstructorProfile, Many-to-1 to Category.
- **Section**: Logical groupings of lessons within a course.
  - *Attributes*: `id` (PK), `course_id` (FK), `title`, `sequence_order`.
  - *Relationship*: Many-to-1 to Course.
- **Lesson**: Individual learning units.
  - *Attributes*: `id` (PK), `section_id` (FK), `title`, `content_type` (VIDEO, TEXT, PDF), `content_url`, `sequence_order`.
  - *Relationship*: Many-to-1 to Section.

## 3. Enrollment & Progress
- **Enrollment**: Associates a student with a course.
  - *Attributes*: `id` (PK), `student_id` (FK), `course_id` (FK), `enrollment_date`, `status` (ACTIVE, COMPLETED).
  - *Relationships*: Many-to-1 to StudentProfile, Many-to-1 to Course.
- **Payment**: Ledger of Stripe transactions.
  - *Attributes*: `id` (PK), `enrollment_id` (FK), `stripe_payment_intent`, `amount`, `status` (PENDING, SUCCEEDED, FAILED).
  - *Relationship*: 1-to-1 or Many-to-1 to Enrollment.
- **Progress**: Granular tracking of lesson completion.
  - *Attributes*: `id` (PK), `enrollment_id` (FK), `lesson_id` (FK), `completed_at`.

## 4. Assessment
- **Quiz**: Assessments attached to sections.
  - *Attributes*: `id` (PK), `section_id` (FK), `title`, `passing_score`.
- **Question**: Individual items for a quiz.
  - *Attributes*: `id` (PK), `quiz_id` (FK), `text`, `options` (JSON), `correct_answer`.
- **QuizAttempt**: Records of a student's submission.
  - *Attributes*: `id` (PK), `student_id` (FK), `quiz_id` (FK), `score`, `passed`.

## 5. Feedback & Certification
- **Review**: Course ratings provided by students.
  - *Attributes*: `id` (PK), `course_id` (FK), `student_id` (FK), `rating`, `comment`.
- **Certificate**: Proof of completion.
  - *Attributes*: `id` (PK), `enrollment_id` (FK), `certificate_url`, `issued_at`.

## 6. Advanced Features (Future Scope)
- **Skill**, **StudentSkill**, **Recommendation**: Entities reserved to map dependencies between courses and student profiles for advanced gap analysis.
