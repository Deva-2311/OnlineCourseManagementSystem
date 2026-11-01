import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { QuizAttemptStatus } from '../quizzes/enums/quiz-attempt-status.enum';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { LessonProgressStatus } from '../progress/enums/lesson-progress-status.enum';
import { Course } from '../courses/entities/course.entity';
import { CourseStatus } from '../courses/enums/course-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import {
  LearningInsightsResponseDto,
  LearningInsightsSummaryDto,
  SkillProficiencyItemDto,
} from './dto/learning-insights-response.dto';
import {
  LearningPathResponseDto,
  LearningPathStepDto,
} from './dto/learning-path-response.dto';
import { SkillProficiencyStatus } from './enums/skill-proficiency-status.enum';
import { LearningStepType } from './enums/learning-step-type.enum';
import { AccessStatus } from './enums/access-status.enum';

interface RawSkillAccumulator {
  skillId: string;
  skillName: string;
  total: number;
  correct: number;
  lastAssessedAt: Date | null;
}

@Injectable()
export class LearningInsightsService {
  private readonly logger = new Logger(LearningInsightsService.name);

  // Minimum answers needed before classifying skill as strong / developing / needs_improvement
  private readonly MIN_EVIDENCE_THRESHOLD = 2;

  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Evaluates student's empirical mastery for all assessed skills based on actual stored quiz answers.
   * Handles retakes by prioritizing the latest submitted attempt for each quiz to avoid double-counting.
   */
  async getLearningInsightsForStudent(studentId: string): Promise<LearningInsightsResponseDto> {
    // 1. Fetch submitted quiz attempts
    const attempts = await this.attemptRepository.find({
      where: { studentId, status: QuizAttemptStatus.SUBMITTED },
      order: { submittedAt: 'DESC' },
      relations: {
        answers: {
          question: {
            skill: true,
          },
        },
      },
    });

    // 2. Group by quiz to select the latest submitted attempt for each quiz (avoids duplicate question counting)
    const latestAttemptsByQuiz = new Map<string, QuizAttempt>();
    for (const attempt of attempts) {
      if (!latestAttemptsByQuiz.has(attempt.quizId)) {
        latestAttemptsByQuiz.set(attempt.quizId, attempt);
      }
    }

    // 3. Aggregate evidence per skill/topic
    const skillMap = new Map<string, RawSkillAccumulator>();

    for (const attempt of latestAttemptsByQuiz.values()) {
      if (!attempt.answers) continue;

      for (const answer of attempt.answers) {
        const question = answer.question;
        if (!question) continue;

        // Determine skill identifier and label
        const skillId = question.skillId || (question.topic ? `topic-${question.topic.toLowerCase().replace(/\s+/g, '-')}` : null);
        const skillName = question.skill?.name || question.topic || null;

        if (!skillId || !skillName) {
          // Gracefully ignore questions without skill/topic mappings
          continue;
        }

        if (!skillMap.has(skillId)) {
          skillMap.set(skillId, {
            skillId,
            skillName,
            total: 0,
            correct: 0,
            lastAssessedAt: attempt.submittedAt || null,
          });
        }

        const record = skillMap.get(skillId)!;
        record.total += 1;
        if (answer.isCorrect) {
          record.correct += 1;
        }

        if (attempt.submittedAt && (!record.lastAssessedAt || attempt.submittedAt > record.lastAssessedAt)) {
          record.lastAssessedAt = attempt.submittedAt;
        }
      }
    }

    // 4. Classify skills according to documented thresholds
    let strongCount = 0;
    let developingCount = 0;
    let needsImprovementCount = 0;
    let insufficientCount = 0;

    const items: SkillProficiencyItemDto[] = [];

    for (const record of skillMap.values()) {
      if (record.total < this.MIN_EVIDENCE_THRESHOLD) {
        insufficientCount++;
        items.push({
          skillId: record.skillId,
          skillName: record.skillName,
          status: SkillProficiencyStatus.INSUFFICIENT_DATA,
          masteryScore: null,
          totalQuestionsAttempted: record.total,
          correctAnswersCount: record.correct,
          lastAssessedAt: record.lastAssessedAt,
          evidenceSummary: `Assessed on ${record.total} question(s). At least ${this.MIN_EVIDENCE_THRESHOLD} questions required for conclusive evaluation.`,
        });
      } else {
        const accuracy = Math.round((record.correct / record.total) * 100);

        if (accuracy >= 80) {
          strongCount++;
          items.push({
            skillId: record.skillId,
            skillName: record.skillName,
            status: SkillProficiencyStatus.STRONG,
            masteryScore: accuracy,
            totalQuestionsAttempted: record.total,
            correctAnswersCount: record.correct,
            lastAssessedAt: record.lastAssessedAt,
            evidenceSummary: `Strong proficiency demonstrated: ${record.correct}/${record.total} questions answered correctly (${accuracy}% accuracy).`,
          });
        } else if (accuracy >= 50) {
          developingCount++;
          items.push({
            skillId: record.skillId,
            skillName: record.skillName,
            status: SkillProficiencyStatus.DEVELOPING,
            masteryScore: accuracy,
            totalQuestionsAttempted: record.total,
            correctAnswersCount: record.correct,
            lastAssessedAt: record.lastAssessedAt,
            evidenceSummary: `Developing competence: ${record.correct}/${record.total} questions answered correctly (${accuracy}% accuracy). Reinforcement recommended.`,
          });
        } else {
          needsImprovementCount++;
          items.push({
            skillId: record.skillId,
            skillName: record.skillName,
            status: SkillProficiencyStatus.NEEDS_IMPROVEMENT,
            masteryScore: accuracy,
            totalQuestionsAttempted: record.total,
            correctAnswersCount: record.correct,
            lastAssessedAt: record.lastAssessedAt,
            evidenceSummary: `Skill gap identified: ${record.correct}/${record.total} questions answered correctly (${accuracy}% accuracy). Remedial review suggested.`,
          });
        }
      }
    }

    // Sort items: NEEDS_IMPROVEMENT first, then DEVELOPING, then INSUFFICIENT_DATA, then STRONG
    const statusPriority = {
      [SkillProficiencyStatus.NEEDS_IMPROVEMENT]: 1,
      [SkillProficiencyStatus.DEVELOPING]: 2,
      [SkillProficiencyStatus.INSUFFICIENT_DATA]: 3,
      [SkillProficiencyStatus.STRONG]: 4,
    };

    items.sort((a, b) => {
      const pDiff = statusPriority[a.status] - statusPriority[b.status];
      if (pDiff !== 0) return pDiff;
      if (a.masteryScore !== null && b.masteryScore !== null) {
        return a.masteryScore - b.masteryScore;
      }
      return a.skillName.localeCompare(b.skillName);
    });

    const summary: LearningInsightsSummaryDto = {
      totalSkillsAssessed: items.length,
      strongSkillsCount: strongCount,
      developingSkillsCount: developingCount,
      needsImprovementCount: needsImprovementCount,
      insufficientDataCount: insufficientCount,
    };

    return {
      summary,
      skills: items,
    };
  }

  /**
   * Constructs an ordered, personalized learning path for the authenticated student.
   * Addresses identified skill gaps with remedial lessons and practice quizzes,
   * advances active course milestones, and suggests relevant published courses.
   */
  async getAdaptiveLearningPathForStudent(studentId: string): Promise<LearningPathResponseDto> {
    // 1. Get current insights
    const insights = await this.getLearningInsightsForStudent(studentId);
    const gapSkills = insights.skills.filter((s) => s.status === SkillProficiencyStatus.NEEDS_IMPROVEMENT);
    const developingSkills = insights.skills.filter((s) => s.status === SkillProficiencyStatus.DEVELOPING);

    const gapSkillNames = new Set(gapSkills.map((s) => s.skillName.toLowerCase()));
    const developingSkillNames = new Set(developingSkills.map((s) => s.skillName.toLowerCase()));

    // 2. Fetch student's enrollments with course details
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId },
      relations: {
        course: {
          category: true,
          sections: {
            lessons: {
              skills: true,
            },
          },
        },
      },
    });

    const activeEnrollments = enrollments.filter(
      (e) => e.status === EnrollmentStatus.ACTIVE || e.status === EnrollmentStatus.COMPLETED,
    );

    // 3. Fetch verified payments for paid courses
    const payments = await this.paymentRepository.find({
      where: { studentId, status: PaymentStatus.SUCCEEDED },
    });
    const paidCourseIds = new Set(payments.map((p) => p.courseId));

    // 4. Fetch student's lesson progress
    const lessonProgressRecords = await this.progressRepository.find({
      where: { studentId },
    });
    const completedLessonIds = new Set(
      lessonProgressRecords
        .filter((lp) => lp.status === LessonProgressStatus.COMPLETED)
        .map((lp) => lp.lessonId),
    );

    // 5. Fetch student's passed quizzes
    const passedAttempts = await this.attemptRepository.find({
      where: { studentId, isPassed: true },
    });
    const passedQuizIds = new Set(passedAttempts.map((pa) => pa.quizId));

    const steps: LearningPathStepDto[] = [];
    const addedItemKeys = new Set<string>();

    const checkAccessStatus = (course: Course, isEnrolled: boolean): AccessStatus => {
      if (!isEnrolled) {
        return course.price > 0 ? AccessStatus.PAYMENT_REQUIRED : AccessStatus.ENROLLMENT_REQUIRED;
      }
      if (course.price > 0 && !paidCourseIds.has(course.id)) {
        return AccessStatus.PAYMENT_REQUIRED;
      }
      return AccessStatus.ACCESSIBLE;
    };

    // --- PHASE A: Remedial Lessons for Skill Gaps in Enrolled Courses ---
    for (const enrollment of activeEnrollments) {
      const course = enrollment.course;
      if (!course || !course.sections) continue;

      const accessStatus = checkAccessStatus(course, true);

      for (const section of course.sections) {
        if (!section.lessons) continue;

        for (const lesson of section.lessons) {
          const lessonKey = `lesson-${lesson.id}`;
          if (addedItemKeys.has(lessonKey)) continue;

          // Check if lesson teaches any identified gap skill
          const teachesGapSkill = lesson.skills?.find((sk: Skill) => gapSkillNames.has(sk.name.toLowerCase()));

          if (teachesGapSkill) {
            addedItemKeys.add(lessonKey);
            const isCompleted = completedLessonIds.has(lesson.id);

            steps.push({
              id: `step-remedial-${lesson.id}`,
              stepType: LearningStepType.REMEDIAL_LESSON,
              title: isCompleted ? `Review: ${lesson.title}` : `Study: ${lesson.title}`,
              description: lesson.description || `Comprehensive lesson module covering ${teachesGapSkill.name}.`,
              reason: `Remedial review to strengthen your understanding of ${teachesGapSkill.name}.`,
              targetSkill: { id: teachesGapSkill.id, name: teachesGapSkill.name },
              accessStatus,
              reference: {
                courseId: course.id,
                courseTitle: course.title,
                sectionId: section.id,
                lessonId: lesson.id,
                price: course.price,
                isFree: Number(course.price) === 0,
              },
              actionUrl: `/student/course/${course.id}`,
              priority: 1,
            });
          }
        }
      }
    }

    // --- PHASE B: Practice Quizzes for Gap & Developing Skills ---
    const allQuizzes = await this.quizRepository.find({
      relations: {
        lesson: {
          section: {
            course: true,
          },
        },
        questions: {
          skill: true,
        },
      },
    });

    for (const quiz of allQuizzes || []) {
      const quizKey = `quiz-${quiz.id}`;
      if (addedItemKeys.has(quizKey) || passedQuizIds.has(quiz.id)) continue;

      const course = quiz.lesson?.section?.course;
      if (!course) continue;

      const isEnrolled = activeEnrollments.some((e) => e.courseId === course.id);
      if (!isEnrolled) continue; // Practice quizzes in enrolled courses

      // Check if quiz questions assess any gap or developing skill
      const assessedGap = quiz.questions?.find((q) => {
        const sName = q.skill?.name || q.topic;
        return sName && (gapSkillNames.has(sName.toLowerCase()) || developingSkillNames.has(sName.toLowerCase()));
      });

      if (assessedGap) {
        const skillName = assessedGap.skill?.name || assessedGap.topic || 'Core Concepts';
        addedItemKeys.add(quizKey);

        steps.push({
          id: `step-quiz-${quiz.id}`,
          stepType: LearningStepType.PRACTICE_QUIZ,
          title: `Practice Quiz: ${quiz.title}`,
          description: quiz.instructions || `Diagnostic quiz targeting ${skillName}.`,
          reason: `Targeted assessment to test and reinforce your grasp of ${skillName}.`,
          targetSkill: { id: assessedGap.skillId || null, name: skillName },
          accessStatus: checkAccessStatus(course, true),
          reference: {
            courseId: course.id,
            courseTitle: course.title,
            quizId: quiz.id,
            lessonId: quiz.lessonId,
            price: course.price,
            isFree: Number(course.price) === 0,
          },
          actionUrl: `/student/quiz/${quiz.id}`,
          priority: 2,
        });
      }
    }

    // --- PHASE C: Next Curriculum Milestones in Enrolled Courses ---
    for (const enrollment of activeEnrollments) {
      const course = enrollment.course;
      if (!course || !course.sections) continue;

      const sortedSections = [...course.sections].sort((a, b) => a.displayOrder - b.displayOrder);

      for (const section of sortedSections) {
        if (!section.lessons) continue;

        const sortedLessons = [...section.lessons].sort((a, b) => a.displayOrder - b.displayOrder);

        for (const lesson of sortedLessons) {
          const lessonKey = `lesson-${lesson.id}`;
          if (!completedLessonIds.has(lesson.id) && !addedItemKeys.has(lessonKey)) {
            addedItemKeys.add(lessonKey);

            steps.push({
              id: `step-milestone-${lesson.id}`,
              stepType: LearningStepType.NEXT_LESSON,
              title: `Next Milestone: ${lesson.title}`,
              description: lesson.description || `Upcoming lesson in ${section.title}.`,
              reason: `Next sequential learning milestone in your enrolled course: ${course.title}.`,
              targetSkill: lesson.skills?.[0] ? { id: lesson.skills[0].id, name: lesson.skills[0].name } : null,
              accessStatus: checkAccessStatus(course, true),
              reference: {
                courseId: course.id,
                courseTitle: course.title,
                sectionId: section.id,
                lessonId: lesson.id,
                price: course.price,
                isFree: Number(course.price) === 0,
              },
              actionUrl: `/student/course/${course.id}`,
              priority: 3,
            });

            // Only add the first uncompleted lesson per course to keep pathway focused
            break;
          }
        }
      }
    }

    // --- PHASE D: Fallback for Students with No Gap Steps or New Students ---
    const isFallback = steps.length === 0;

    if (isFallback) {
      // Find published courses
      const publishedCourses = await this.courseRepository.find({
        where: { status: CourseStatus.PUBLISHED },
        relations: { category: true, sections: { lessons: true } },
        order: { createdAt: 'DESC' },
        take: 3,
      });

      for (const pubCourse of publishedCourses) {
        const isEnrolled = activeEnrollments.some((e) => e.courseId === pubCourse.id);
        const courseKey = `course-fallback-${pubCourse.id}`;

        if (!addedItemKeys.has(courseKey)) {
          addedItemKeys.add(courseKey);

          steps.push({
            id: `step-fallback-${pubCourse.id}`,
            stepType: isEnrolled ? LearningStepType.NEXT_LESSON : LearningStepType.RECOMMENDED_COURSE,
            title: isEnrolled ? `Resume: ${pubCourse.title}` : `Discover: ${pubCourse.title}`,
            description: pubCourse.shortDescription || pubCourse.description || 'Foundational curriculum module.',
            reason: isEnrolled
              ? 'Continue your enrolled coursework to establish your competency profile.'
              : 'Recommended entry-point course to build foundational academic competencies.',
            targetSkill: null,
            accessStatus: checkAccessStatus(pubCourse, isEnrolled),
            reference: {
              courseId: pubCourse.id,
              courseTitle: pubCourse.title,
              price: pubCourse.price,
              isFree: Number(pubCourse.price) === 0,
            },
            actionUrl: isEnrolled ? `/student/course/${pubCourse.id}` : `/courses/${pubCourse.id}`,
            priority: 4,
          });
        }
      }
    }

    // Deterministic sort: priority ASC, title ASC, id ASC
    steps.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const tComp = a.title.localeCompare(b.title);
      if (tComp !== 0) return tComp;
      return a.id.localeCompare(b.id);
    });

    return {
      data: steps,
      meta: {
        totalSteps: steps.length,
        hasSkillGaps: gapSkills.length > 0,
        isFallback,
      },
    };
  }
}
