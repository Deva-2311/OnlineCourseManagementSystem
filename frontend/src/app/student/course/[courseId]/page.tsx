"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  ArrowLeft,
  Award,
  FileText,
  Video,
  Layers,
  Sparkles,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { CourseProgressSummary } from "@/types";
import { getAuthToken, API_BASE } from "@/lib/api";

interface LessonContent {
  id: string;
  sectionId: string;
  title: string;
  contentType: "VIDEO" | "TEXT" | "PDF" | string;
  contentUrl?: string | null;
  contentText?: string | null;
  durationMinutes: number;
  sequenceOrder: number;
  isPreview: boolean;
}

function CourseProgressContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [summary, setSummary] = useState<CourseProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [claimingCert, setClaimingCert] = useState(false);

  // Active lesson content viewer state
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load course progress");
      }

      const data: CourseProgressSummary = await res.json();
      setSummary(data);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Could not retrieve course progress metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    const token = getAuthToken();

    fetch(`${API_BASE}/courses/${courseId}/progress`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load course progress");
        }
        return res.json();
      })
      .then((data: CourseProgressSummary) => {
        if (active) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Could not retrieve course progress metrics");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const handleOpenLesson = async (lessonId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Could not load lesson content");
      }

      const data: LessonContent = await res.json();
      setActiveLesson(data);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Could not view lesson content.");
    }
  };

  const handleStartLesson = async (lessonId: string) => {
    try {
      setActionLoadingId(lessonId);
      setSuccessMessage(null);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/lessons/${lessonId}/progress/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to start lesson");
      }

      await fetchProgress();
      setSuccessMessage("Lesson progress started!");
      setTimeout(() => setSuccessMessage(null), 3000);
      handleOpenLesson(lessonId);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Error starting lesson");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      setActionLoadingId(lessonId);
      setSuccessMessage(null);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/lessons/${lessonId}/progress/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to complete lesson");
      }

      const result = await res.json();
      if (result.courseProgress) {
        setSummary(result.courseProgress);
      } else {
        await fetchProgress();
      }

      setSuccessMessage("Lesson completed!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Error marking lesson as completed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClaimCertificate = async () => {
    if (!summary?.enrollmentId) return;
    try {
      setClaimingCert(true);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/enrollments/${summary.enrollmentId}/certificate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to issue certificate");
      }

      router.push("/student/certificates");
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Could not claim certificate");
    } finally {
      setClaimingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-on-surface-variant text-sm font-medium animate-pulse">
          Synchronizing learning progress...
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-error mx-auto" />
          <h2 className="text-lg font-bold text-on-surface">Course Access Notice</h2>
          <p className="text-sm text-on-surface-variant">
            {error || "Unable to load curriculum progress. An active course enrollment is required."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => router.push("/student")}
              className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-medium"
            >
              Back to Dashboard
            </button>
            <button
              onClick={fetchProgress}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Group lessons by section
  const sectionMap = new Map<
    string,
    { sectionTitle: string; lessons: typeof summary.lessons }
  >();

  if (summary.lessons) {
    summary.lessons.forEach((l) => {
      const existing = sectionMap.get(l.sectionId) || {
        sectionTitle: l.sectionTitle,
        lessons: [],
      };
      existing.lessons?.push(l);
      sectionMap.set(l.sectionId, existing);
    });
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/student")}
            className="flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Portal</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-outline">
            <span>Matriculated ID:</span>
            <span className="font-mono text-on-surface font-semibold truncate max-w-[150px]">
              {summary.enrollmentId}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Progress Overview Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-outline">
                Enrolled Curriculum Pathway
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-1">
                Learning Progress
              </h1>
            </div>

            {/* Certificate claim action */}
            {summary.isCompleted ? (
              <button
                disabled={claimingCert}
                onClick={handleClaimCertificate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-colors"
              >
                <Award className="w-5 h-5" />
                <span>{claimingCert ? "Claiming..." : "Claim Certificate"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/40">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Complete all lessons to earn accredited certificate</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-baseline text-xs text-on-surface-variant font-medium">
              <span>
                Completed:{" "}
                <strong className="text-on-surface">
                  {summary.completedLessons} of {summary.totalLessons} lectures
                </strong>
              </span>
              <span className="text-base font-bold text-primary font-mono">
                {summary.completionPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${summary.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Lesson Content Viewer Modal */}
        {activeLesson && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border-2 border-primary/30 shadow-lg space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {activeLesson.contentType === "VIDEO" ? (
                    <Video className="w-4 h-4" />
                  ) : activeLesson.contentType === "PDF" ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-outline block">
                    Active Lesson Viewer ({activeLesson.contentType})
                  </span>
                  <h2 className="text-lg font-bold text-on-surface">{activeLesson.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setActiveLesson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Close Lesson Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video content */}
            {activeLesson.contentType === "VIDEO" && activeLesson.contentUrl && (
              <div className="space-y-3">
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  <iframe
                    src={activeLesson.contentUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                </div>
              </div>
            )}

            {/* Text / Reading Content */}
            {activeLesson.contentText && (
              <div className="prose prose-slate max-w-none text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                {activeLesson.contentText}
              </div>
            )}

            {/* Content URL Link */}
            {activeLesson.contentUrl && activeLesson.contentType !== "VIDEO" && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-900 font-medium">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Document / Resource Material</span>
                </div>
                <a
                  href={activeLesson.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleCompleteLesson(activeLesson.id)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container"
              >
                Mark This Lesson as Completed
              </button>
            </div>
          </div>
        )}

        {/* Curriculum Sections & Lessons */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Curriculum Sections</span>
          </h2>

          {sectionMap.size === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant text-center">
              <BookOpen className="w-10 h-10 text-outline mx-auto mb-2 opacity-40" />
              <p className="text-sm text-on-surface-variant">
                No lessons published in this course yet.
              </p>
            </div>
          ) : (
            Array.from(sectionMap.entries()).map(([sectionId, section], sIdx) => (
              <div
                key={sectionId}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-primary">
                    Section {String(sIdx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-bold text-on-surface">
                    {section.sectionTitle}
                  </h3>
                </div>

                <div className="divide-y divide-surface-container-low pt-1">
                  {section.lessons?.map((lesson) => {
                    const isCompleted = lesson.status === "COMPLETED";
                    const isInProgress = lesson.status === "IN_PROGRESS";
                    const isProcessing = actionLoadingId === lesson.lessonId;

                    return (
                      <div
                        key={lesson.lessonId}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/40 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenLesson(lesson.lessonId)}
                            className="mt-0.5 shrink-0"
                            title="Open Lesson Content"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : isInProgress ? (
                              <PlayCircle className="w-5 h-5 text-blue-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-outline hover:border-primary transition-colors" />
                            )}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenLesson(lesson.lessonId)}
                              className="text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left block"
                            >
                              {lesson.title}
                            </button>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isInProgress
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-surface-container text-outline"
                                }`}
                              >
                                {lesson.status.replace("_", " ")}
                              </span>

                              {/* Quizzes badge */}
                              {lesson.quizzes && lesson.quizzes.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  {lesson.quizzes.map((q) => (
                                    <button
                                      key={q.quizId}
                                      onClick={() => router.push(`/student/quiz/${q.quizId}`)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                                        q.isPassed
                                          ? "bg-emerald-100 text-emerald-800"
                                          : q.attemptsCount > 0
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-surface-container-high text-primary hover:underline"
                                      }`}
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>{q.title}: {q.isPassed ? "Passed" : `${q.highestScore}/${q.maxScore}`}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenLesson(lesson.lessonId)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
                          >
                            View
                          </button>

                          {!isCompleted && (
                            <>
                              {lesson.status === "NOT_STARTED" && (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleStartLesson(lesson.lessonId)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                  {isProcessing ? "Starting..." : "Start"}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleCompleteLesson(lesson.lessonId)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {isProcessing ? "Saving..." : "Mark Complete"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentCourseProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CourseProgressContent />
    </Suspense>
  );
}
