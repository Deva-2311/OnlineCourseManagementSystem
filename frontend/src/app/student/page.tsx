"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { SafeEnrollmentDto } from "@/types";
import RecommendedCoursesSection from "@/components/recommendations/RecommendedCoursesSection";
import LearningInsightsSection from "@/components/learning-insights/LearningInsightsSection";
import {
  BookOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface StudentSummary {
  enrollments: {
    total: number;
    active: number;
    completed: number;
    completionRatePercent: number;
  };
  lessons: {
    completedTotal: number;
  };
  quizzes: {
    totalAttempts: number;
    passedAttempts: number;
    passRatePercent: number;
    averageScorePercent: number | null;
  };
  certificates: {
    total: number;
  };
}

export default function StudentDashboardPage() {
  const [enrollments, setEnrollments] = useState<SafeEnrollmentDto[]>([]);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [enrollmentData, summaryData] = await Promise.allSettled([
          apiFetch<SafeEnrollmentDto[]>("/enrollments/me"),
          apiFetch<StudentSummary>("/student/learning-summary"),
        ]);

        if (enrollmentData.status === "fulfilled") {
          setEnrollments(enrollmentData.value || []);
        }
        if (summaryData.status === "fulfilled") {
          setSummary(summaryData.value);
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message;
        setError(msg || "Failed to load academic workspace.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Academic Context Header */}
      <section className="flex flex-col gap-3 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Student Workspace</span>
          <span>/</span>
          <span className="text-blue-600">Active Curriculum &amp; Enrolments</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              My Academic Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Track course progress, attend lectures, submit quiz assessments, and review certified achievements.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Catalog</span>
            </Link>
          </div>
        </div>

        {/* Real Summary Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Enrolled Courses
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary?.enrollments?.total ?? enrollments.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({summary?.enrollments?.active ?? enrollments.filter((e) => e.status === "ACTIVE").length} active)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              {summary?.enrollments?.completed ?? 0} courses completed
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Lectures Completed
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-blue-600">
                {summary?.lessons?.completedTotal ?? 0}
              </span>
              <span className="text-xs text-slate-500">lessons</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1">
              Continuous Progress
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Quiz Assessments
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary?.quizzes?.averageScorePercent !== null && summary?.quizzes?.averageScorePercent !== undefined
                  ? `${summary.quizzes.averageScorePercent}%`
                  : "N/A"}
              </span>
              <span className="text-xs text-slate-500 font-medium">avg score</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              {summary?.quizzes?.passedAttempts ?? 0} of {summary?.quizzes?.totalAttempts ?? 0} passed
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Certificates Conferred
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-amber-600">
                {summary?.certificates?.total ?? 0}
              </span>
              <span className="text-xs text-slate-500">awards</span>
            </div>
            <Link
              href="/student/certificates"
              className="text-[11px] text-blue-600 hover:underline font-medium mt-1"
            >
              View credential records →
            </Link>
          </div>
        </div>
      </section>

      {/* Active Enrolled Courses Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>My Enrolled Courses</span>
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {enrollments.length} total enrolled
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Synchronizing your enrolled coursework...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <p className="font-semibold">{error}</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-800 text-base">No active course enrolments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore the university course catalog to enroll in foundational modules, open audit courses, and specialized seminars.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <span>Explore Course Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enr) => {
              const course = enr.course;
              const title = course?.title || "Enrolled Course";
              const catName =
                typeof course?.category === "object"
                  ? course?.category?.name
                  : course?.category || "General Studies";

              return (
                <article
                  key={enr.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                        {catName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          enr.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : enr.status === "COMPLETED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {enr.status}
                      </span>
                    </div>

                    <Link href={`/student/course/${enr.courseId}`}>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {title}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {course?.shortDescription || course?.description || "Course modules and learning assets."}
                    </p>

                    <div className="text-[11px] text-slate-400 font-mono pt-1">
                      Enrolled on {new Date(enr.enrolledAt || enr.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Curriculum Track</span>
                      <Link
                        href={`/student/course/${enr.courseId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Recommendations & Skill Gaps Sections */}
      <RecommendedCoursesSection />
      <LearningInsightsSection />
    </div>
  );
}
