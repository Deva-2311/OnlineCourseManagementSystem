/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { apiFetch, getAuthToken, getStoredUser } from "@/lib/api";
import { Course, EnrollmentStatusResponse } from "@/types";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  User as UserIcon,
  Layers,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface CurriculumLesson {
  id: string;
  title: string;
  contentType: string;
  durationMinutes: number;
  sequenceOrder: number;
  isPreview: boolean;
}

interface CurriculumSection {
  id: string;
  title: string;
  sequenceOrder: number;
  lessons: CurriculumLesson[];
}

interface CurriculumOutline {
  courseId: string;
  totalSections: number;
  totalLessons: number;
  sections: CurriculumSection[];
}

function CourseDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumOutline | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const user = getStoredUser();
  const token = getAuthToken();

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch course details
        const courseData = await apiFetch<Course>(`/courses/${courseId}`);
        setCourse(courseData);

        // Fetch curriculum outline
        try {
          const currData = await apiFetch<CurriculumOutline>(`/courses/${courseData.id}/curriculum`);
          setCurriculum(currData);
          // Expand first section by default
          if (currData?.sections?.[0]) {
            setExpandedSections({ [currData.sections[0].id]: true });
          }
        } catch {
          // Curriculum outline may be empty
        }

        // If user is a student, check enrollment status
        if (token && user?.role === "STUDENT") {
          try {
            const statusData = await apiFetch<EnrollmentStatusResponse>(
              `/courses/${courseData.id}/enrollment-status`
            );
            setEnrollmentStatus(statusData);
          } catch {
            // Unenrolled
          }
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message;
        setError(msg || "Failed to load course details.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, token, user?.role]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEnrollFree = async () => {
    if (!token) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }
    if (!course) return;

    try {
      setEnrolling(true);
      await apiFetch(`/courses/${course.id}/enroll`, {
        method: "POST",
      });
      // Redirect to student player
      router.push(`/student/course/${course.id}`);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Failed to complete enrollment.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollPaid = async () => {
    if (!token) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }
    if (!course) return;

    try {
      setEnrolling(true);
      const res = await apiFetch<{
        sessionId: string;
        checkoutUrl: string;
        paymentId: string;
      }>("/payments/checkout-session", {
        method: "POST",
        body: JSON.stringify({ courseId: course.id }),
      });

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        alert("Payment checkout initiated. Session ID: " + res.sessionId);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Failed to initiate payment checkout session.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 pt-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
          <p className="text-on-surface-variant font-body-md animate-pulse">
            Loading course syllabus and curriculum...
          </p>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 pt-24">
          <div className="max-w-md w-full bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-error mx-auto" />
            <h2 className="text-xl font-bold text-on-surface">Course Not Available</h2>
            <p className="text-sm text-on-surface-variant">
              {error || "The requested course could not be found or has not been published yet."}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const priceNum = Number(course.price || 0);
  const isFree = priceNum === 0;
  const isEnrolled = enrollmentStatus?.isEnrolled && enrollmentStatus?.status === "ACTIVE";
  const catName =
    typeof course.category === "object" ? course.category?.name : course.category || "General";

  return (
    <>
      <Header />
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-16rem)] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <Link href="/courses" className="hover:text-primary transition-colors">
              Courses
            </Link>
            <span>/</span>
            <span className="text-on-surface-variant">{catName}</span>
            <span>/</span>
            <span className="text-on-surface font-semibold truncate max-w-xs sm:max-w-md">
              {course.title}
            </span>
          </nav>

          {/* Enrolled Status Notification Banner */}
          {isEnrolled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    You are enrolled in this course!
                  </p>
                  <p className="text-xs text-emerald-700">
                    Your learning progress and quiz submissions are active.
                  </p>
                </div>
              </div>
              <Link
                href={`/student/course/${course.id}`}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Go to Learning Player</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Main Course Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Cols: Overview, Description & Curriculum */}
            <div className="lg:col-span-8 space-y-8">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-primary-container/20 text-primary text-xs font-bold uppercase tracking-wider">
                    {catName}
                  </span>
                  <span className="text-outline text-xs">•</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-semibold text-on-surface-variant">
                    {course.difficultyLevel || course.level || "All Levels"}
                  </span>
                  {course.estimatedDuration && (
                    <>
                      <span className="text-outline text-xs">•</span>
                      <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.estimatedDuration} estimated hours
                      </span>
                    </>
                  )}
                </div>

                <h1 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                  {course.title}
                </h1>

                <p className="font-body-lg text-base text-on-surface-variant leading-relaxed">
                  {course.shortDescription || course.description}
                </p>

                {/* Instructor Card */}
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-variant/60 flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-outline font-semibold block">
                      Lead Faculty Instructor
                    </span>
                    <span className="text-sm font-bold text-on-surface">
                      {course.instructorName || course.instructor?.fullName || "University Faculty Member"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Description & Outcomes */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-variant space-y-6 shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Syllabus Overview</span>
                  </h2>
                  <div className="prose prose-slate max-w-none text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {course.description}
                  </div>
                </div>

                {/* Learning Outcomes */}
                {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                  <div className="pt-4 border-t border-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">
                      Course Learning Outcomes
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-on-surface-variant">
                      {course.learningOutcomes.map((outcome: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div className="pt-4 border-t border-surface-variant">
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">
                      Academic Prerequisites
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {course.prerequisites.map((req: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-medium text-slate-700 border border-surface-variant"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Curriculum Sections & Lessons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <span>Curriculum &amp; Lecture Schedule</span>
                  </h2>
                  {curriculum && (
                    <span className="text-xs text-outline font-medium">
                      {curriculum.totalSections} sections • {curriculum.totalLessons} lessons
                    </span>
                  )}
                </div>

                {!curriculum || !curriculum.sections || curriculum.sections.length === 0 ? (
                  <div className="p-8 rounded-xl bg-surface-container-lowest border border-surface-variant text-center text-outline">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Curriculum outline is being finalized by faculty.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {curriculum.sections.map((sec, sIdx) => {
                      const isExpanded = expandedSections[sec.id] ?? false;

                      return (
                        <div
                          key={sec.id}
                          className="bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSection(sec.id)}
                            className="w-full px-5 py-3.5 bg-surface-container-low/60 hover:bg-surface-container-low flex items-center justify-between text-left transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-primary">
                                Section {String(sIdx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-sm font-bold text-on-surface">
                                {sec.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-outline">
                              <span>{sec.lessons?.length || 0} lectures</span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-surface-container-low p-2">
                              {sec.lessons?.map((les) => (
                                <div
                                  key={les.id}
                                  className="px-4 py-2.5 flex items-center justify-between text-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                                    <span className="truncate text-on-surface font-medium">
                                      {les.title}
                                    </span>
                                    {les.isPreview && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 shrink-0">
                                        Preview
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-outline shrink-0">
                                    {les.durationMinutes && <span>{les.durationMinutes}m</span>}
                                    {!isEnrolled && !les.isPreview && (
                                      <Lock className="w-3.5 h-3.5 text-outline" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Tuition & Enrolment Card */}
            <div className="lg:col-span-4 sticky top-24 space-y-5">
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant shadow-md space-y-5">
                {/* Thumbnail Preview */}
                {(course.thumbnailUrl || course.thumbnail) && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={course.thumbnailUrl || course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Tuition Header */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                    Tuition &amp; Fees
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-primary font-headline-lg">
                      {isFree ? "Free Audit" : `$${priceNum.toFixed(2)}`}
                    </span>
                    {!isFree && <span className="text-xs text-outline font-medium">USD • full access</span>}
                  </div>
                </div>

                {/* Primary Action Button */}
                {isEnrolled ? (
                  <Link
                    href={`/student/course/${course.id}`}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Continue Learning</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : isFree ? (
                  <button
                    type="button"
                    disabled={enrolling}
                    onClick={handleEnrollFree}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {enrolling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enrolling...</span>
                      </>
                    ) : (
                      <>
                        <span>Enroll Now (Free)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={enrolling}
                    onClick={handleEnrollPaid}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {enrolling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Starting Checkout...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Enroll &amp; Pay (${priceNum.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                )}

                {/* Guarantees */}
                <div className="pt-4 border-t border-surface-variant space-y-2 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>Official accredited registrar curriculum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                    <span>Verifiable cryptographic certificate upon completion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-tertiary shrink-0" />
                    <span>Full lifetime access to enrolled content</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CourseDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CourseDetailsContent />
    </Suspense>
  );
}
