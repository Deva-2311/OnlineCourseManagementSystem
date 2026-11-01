# Actors and Use Cases

## 1. Primary Actors
- **Student**: An end-user who browses, purchases, and learns from courses.
- **Instructor**: A content creator who builds courses, lessons, and quizzes, and monitors student progress.
- **Administrator**: A platform manager overseeing users, approving courses, and managing system-wide settings.

## 2. External Systems (Actors)
- **Stripe Payment Gateway**: Handles payment processing and webhooks.
- **Email/Notification Service**: Sends transactional emails.
- **Media Storage Service**: Stores course videos, images, and attachments (e.g., S3/Cloudinary).

## 3. Major Use Cases (for OOAD Diagrams)

### Student Use Cases
- Register and Login
- Browse, Search, and Filter Courses
- View Course Details and Prerequisites
- Enroll in Courses (and make online payments)
- Access Enrolled Courses and Study Lessons
- Take Quizzes and View Results
- Track Learning Progress
- Receive Course Recommendations and View Skill Gaps
- Complete Courses, Obtain and Verify Certificates
- Submit Course Reviews

### Instructor Use Cases
- Register/Login as Instructor
- Create, Edit, and Manage Courses
- Create Sections, Lessons, and Quizzes
- Upload Learning Content
- View Enrolled Students and Monitor Progress
- View Course Analytics

### Administrator Use Cases
- Manage Users (Students, Instructors, Admins)
- Approve/Reject Course Submissions
- Manage Platform Categories
- Monitor System Activities, Payments, and Enrollments
- Manage Certificates and View Reports
