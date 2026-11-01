export type UserRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Course {
  id: string;
  title: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  instructorName?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  category?: string | Category | null;
  rating?: number;
  studentsCount?: number;
  durationHours?: number;
  estimatedDuration?: number;
  level?: "Beginner" | "Intermediate" | "Advanced" | string;
  difficultyLevel?: "Beginner" | "Intermediate" | "Advanced" | string;
  price: number;
  isFree?: boolean;
  currency?: string;
  status: "DRAFT" | "PENDING" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | string;
  rejectionReason?: string | null;
  createdAt?: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
  instructor?: { id?: string; name?: string; fullName?: string; email?: string } | null;
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  sequenceOrder: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  sectionId: string;
  title: string;
  contentType: "VIDEO" | "TEXT" | "PDF";
  durationMinutes: number;
  sequenceOrder: number;
}

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";
export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  displayOrder: number;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: QuestionType;
  points: number;
  displayOrder: number;
  explanation?: string;
  options: QuestionOption[];
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  instructions?: string;
  timeLimitMinutes?: number;
  maxAttempts: number;
  passingScore: number;
  isPublished: boolean;
  totalPoints: number;
  questionsCount: number;
  questions?: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  awardedPoints: number;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: string;
  submittedAt?: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  answers?: StudentAnswer[];
  createdAt: string;
  updatedAt: string;
}

export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  enrollmentId: string;
  status: LessonProgressStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonQuizSummary {
  quizId: string;
  title: string;
  isPassed: boolean;
  highestScore: number;
  maxScore: number;
  attemptsCount: number;
}

export interface LessonProgressDetail {
  lessonId: string;
  title: string;
  sectionId: string;
  sectionTitle: string;
  displayOrder: number;
  status: LessonProgressStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  quizzes?: LessonQuizSummary[];
}

export interface CourseProgressSummary {
  courseId: string;
  enrollmentId: string;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  remainingLessons: number;
  completionPercentage: number;
  lastActivityAt?: string | null;
  isCompleted: boolean;
  lessons?: LessonProgressDetail[];
}

export interface InstructorStudentProgress {
  student: {
    id: string;
    email: string;
    fullName: string;
  };
  enrollmentId: string;
  enrolledAt?: string | null;
  status: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  lastActivityAt?: string | null;
  isCompleted: boolean;
}

export type CertificateStatus = 'ACTIVE' | 'REVOKED';

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  courseId: string;
  enrollmentId: string;
  courseTitle: string;
  recipientName: string;
  status: CertificateStatus;
  issuedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  verificationUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCertificateVerification {
  isValid: boolean;
  status: CertificateStatus;
  certificateNumber: string;
  courseTitle: string;
  recipientName: string;
  issuedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

export interface RecommendedCourseItem {
  course: Course;
  reason: string;
  score: number;
  signals: string[];
}

export interface RecommendationResponse {
  data: RecommendedCourseItem[];
  meta: {
    total: number;
    limit: number;
    isFallback: boolean;
  };
}

export type SkillProficiencyStatus =
  | 'STRONG'
  | 'DEVELOPING'
  | 'NEEDS_IMPROVEMENT'
  | 'INSUFFICIENT_DATA';

export type LearningStepType =
  | 'REMEDIAL_LESSON'
  | 'PRACTICE_QUIZ'
  | 'PREREQUISITE_STUDY'
  | 'NEXT_LESSON'
  | 'RECOMMENDED_COURSE';

export type AccessStatus = 'ACCESSIBLE' | 'ENROLLMENT_REQUIRED' | 'PAYMENT_REQUIRED';

export interface SkillProficiencyItem {
  skillId: string;
  skillName: string;
  status: SkillProficiencyStatus;
  masteryScore: number | null;
  totalQuestionsAttempted: number;
  correctAnswersCount: number;
  lastAssessedAt: string | null;
  evidenceSummary: string;
}

export interface LearningInsightsSummary {
  totalSkillsAssessed: number;
  strongSkillsCount: number;
  developingSkillsCount: number;
  needsImprovementCount: number;
  insufficientDataCount: number;
}

export interface LearningInsightsResponse {
  summary: LearningInsightsSummary;
  skills: SkillProficiencyItem[];
}

export interface LearningPathStep {
  id: string;
  stepType: LearningStepType;
  title: string;
  description: string;
  reason: string;
  targetSkill?: { id?: string | null; name: string } | null;
  accessStatus: AccessStatus;
  reference: {
    courseId?: string;
    courseTitle?: string;
    sectionId?: string;
    lessonId?: string;
    quizId?: string;
    price?: number;
    isFree?: boolean;
  };
  actionUrl: string;
  priority: number;
}

export interface LearningPathResponse {
  data: LearningPathStep[];
  meta: {
    totalSteps: number;
    hasSkillGaps: boolean;
    isFallback: boolean;
  };
}

// ─────────────────────────────────────────
// Phase 17 — Notifications
// ─────────────────────────────────────────

export type NotificationType =
  | 'ENROLLMENT_CONFIRMED'
  | 'ENROLLMENT_PENDING_PAYMENT'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'QUIZ_SUBMITTED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'CERTIFICATE_ISSUED'
  | 'SYSTEM_ANNOUNCEMENT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

// ─────────────────────────────────────────
// Enrollments
// ─────────────────────────────────────────

export type EnrollmentStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SafeEnrollmentDto {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  course?: Course;
  progressPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentStatusResponse {
  isEnrolled: boolean;
  status?: EnrollmentStatus | null;
  enrollmentId?: string | null;
  enrolledAt?: string | null;
  isPaid?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  courseCount?: number;
}

