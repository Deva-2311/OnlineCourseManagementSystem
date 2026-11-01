"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LearningInsightsResponse,
  LearningPathResponse,
  LearningPathStep,
} from "@/types";
import { apiFetch, getAuthToken } from "@/lib/api";

export default function LearningInsightsSection() {
  const [insights, setInsights] = useState<LearningInsightsResponse | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "gaps" | "strong">("all");

  const fetchData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setInsights(null);
      setLearningPath(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [insightsData, pathData] = await Promise.all([
        apiFetch<LearningInsightsResponse>("/learning-insights/me"),
        apiFetch<LearningPathResponse>("/learning-paths/me"),
      ]);
      setInsights(insightsData);
      setLearningPath(pathData);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg = (err as { message?: string })?.message;
      if (status === 401) {
        setInsights(null);
        setLearningPath(null);
      } else {
        setError(msg || "Failed to load skill-gap analysis");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token) {
      setTimeout(() => {
        if (active) setLoading(false);
      }, 0);
      return () => {
        active = false;
      };
    }

    Promise.all([
      apiFetch<LearningInsightsResponse>("/learning-insights/me"),
      apiFetch<LearningPathResponse>("/learning-paths/me"),
    ])
      .then(([insightsData, pathData]) => {
        if (active) {
          setInsights(insightsData);
          setLearningPath(pathData);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const status = (err as { status?: number })?.status;
        const msg = (err as { message?: string })?.message;
        if (status === 401) {
          setInsights(null);
          setLearningPath(null);
        } else {
          setError(msg || "Failed to load skill-gap analysis");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "STRONG":
        return {
          label: "Strong Proficiency",
          bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
          icon: "check_circle",
          barColor: "bg-emerald-500",
        };
      case "DEVELOPING":
        return {
          label: "Developing",
          bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
          icon: "trending_up",
          barColor: "bg-amber-500",
        };
      case "NEEDS_IMPROVEMENT":
        return {
          label: "Skill Gap Identified",
          bg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
          icon: "warning",
          barColor: "bg-rose-500",
        };
      default:
        return {
          label: "Insufficient Evidence",
          bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
          icon: "help_outline",
          barColor: "bg-slate-400",
        };
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "REMEDIAL_LESSON":
        return "auto_stories";
      case "PRACTICE_QUIZ":
        return "quiz";
      case "NEXT_LESSON":
        return "play_circle";
      default:
        return "school";
    }
  };

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case "REMEDIAL_LESSON":
        return "Remedial Lesson";
      case "PRACTICE_QUIZ":
        return "Targeted Practice";
      case "NEXT_LESSON":
        return "Next Milestone";
      default:
        return "Recommended Course";
    }
  };

  const getAccessBadge = (access: string) => {
    switch (access) {
      case "ACCESSIBLE":
        return {
          label: "Enrolled & Ready",
          classes: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
          icon: "lock_open",
        };
      case "PAYMENT_REQUIRED":
        return {
          label: "Tuition Required",
          classes: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
          icon: "credit_card",
        };
      default:
        return {
          label: "Enrollment Required",
          classes: "bg-primary/10 text-primary border border-primary/20",
          icon: "how_to_reg",
        };
    }
  };

  const filteredSkills = (insights?.skills || []).filter((s) => {
    if (activeTab === "gaps") return s.status === "NEEDS_IMPROVEMENT" || s.status === "DEVELOPING";
    if (activeTab === "strong") return s.status === "STRONG";
    return true;
  });

  return (
    <section className="flex flex-col gap-space-md pt-space-lg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm border-b border-outline-variant/30 gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-primary">Skill-Gap Analysis & Adaptive Pathways</h2>
              {learningPath?.meta?.isFallback && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-surface-container text-on-surface-variant border border-outline-variant/50">
                  Exploratory Roadmap
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Empirical mastery evaluated from your latest quiz assessments, highlighting key learning opportunities.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors shadow-sm self-start sm:self-auto disabled:opacity-50"
          title="Recalculate insights from latest quiz attempts"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
            refresh
          </span>
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg animate-pulse">
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="h-28 bg-surface-container rounded-xl"></div>
            <div className="h-44 bg-surface-container rounded-xl"></div>
          </div>
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="h-24 bg-surface-container rounded-xl"></div>
            <div className="h-48 bg-surface-container rounded-xl"></div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-space-lg rounded-xl bg-error-container/20 border border-error-container flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[28px]">error</span>
            <div>
              <p className="font-label-lg text-label-lg font-semibold text-error">Unable to load skill insights</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-error text-on-error font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && insights && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* LEFT: Skill Proficiency & Performance Breakdown (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Metric Summary Strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Strong</span>
                <span className="font-headline-md text-headline-md font-bold text-emerald-600 mt-0.5">
                  {insights.summary.strongSkillsCount}
                </span>
                <span className="text-[11px] text-on-surface-variant">≥ 80% accuracy</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Developing</span>
                <span className="font-headline-md text-headline-md font-bold text-amber-600 mt-0.5">
                  {insights.summary.developingSkillsCount}
                </span>
                <span className="text-[11px] text-on-surface-variant">50% – 79% score</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline">Skill Gaps</span>
                <span className="font-headline-md text-headline-md font-bold text-rose-600 mt-0.5">
                  {insights.summary.needsImprovementCount}
                </span>
                <span className="text-[11px] text-on-surface-variant">&lt; 50% accuracy</span>
              </div>
            </div>

            {/* Filter Tabs */}
            {insights.skills.length > 0 && (
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
                    activeTab === "all"
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  All ({insights.skills.length})
                </button>
                <button
                  onClick={() => setActiveTab("gaps")}
                  className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
                    activeTab === "gaps"
                      ? "bg-surface-container-lowest text-rose-600 shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Gaps ({insights.summary.needsImprovementCount + insights.summary.developingSkillsCount})
                </button>
                <button
                  onClick={() => setActiveTab("strong")}
                  className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
                    activeTab === "strong"
                      ? "bg-surface-container-lowest text-emerald-600 shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Strong ({insights.summary.strongSkillsCount})
                </button>
              </div>
            )}

            {/* Skill Bars List */}
            <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredSkills.length === 0 ? (
                <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-[32px] mb-2">assignment_late</span>
                  <p className="font-label-md text-label-md font-semibold text-primary">No Skill Records Found</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mt-1">
                    Complete quizzes in your enrolled courses to build verifiable data evidence.
                  </p>
                </div>
              ) : (
                filteredSkills.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={item.skillId}
                      className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-label-lg text-label-lg font-semibold text-primary leading-snug">
                            {item.skillName}
                          </h4>
                          <span className="text-[11px] text-on-surface-variant">
                            {item.correctAnswersCount} / {item.totalQuestionsAttempted} questions correct
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                          {badge.label}
                        </span>
                      </div>

                      {/* Visual Accuracy Bar */}
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${badge.barColor}`}
                          style={{ width: `${item.masteryScore ?? 15}%` }}
                        ></div>
                      </div>

                      {/* Evidence Summary Text */}
                      <p className="text-[12px] text-on-surface-variant leading-relaxed">
                        {item.evidenceSummary}
                      </p>
                    </div>
                  );
                })
              )}

              {/* Insufficient Data Clarification Banner */}
              {insights.summary.insufficientDataCount > 0 && (
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-[12px] text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-[18px]">info</span>
                  <span>
                    {insights.summary.insufficientDataCount} skill(s) require at least 2 questions to establish reliable proficiency metrics.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Ordered Adaptive Learning Pathway (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary">Your Next Steps</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Personalized, ordered sequence addressing identified gaps first.
                </p>
              </div>
              <span className="font-code-sm text-code-sm text-outline">
                {learningPath?.data?.length || 0} recommendations
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {!learningPath || learningPath.data.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center">
                  <span className="material-symbols-outlined text-outline text-[36px] mb-2">done_all</span>
                  <p className="font-label-lg text-label-lg font-semibold text-primary">No Immediate Recommendations</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto mt-1">
                    You have achieved strong mastery across all assessed skills! Explore the catalog to discover new topics.
                  </p>
                  <Link
                    href="/courses"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <span>Browse Catalog</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              ) : (
                learningPath.data.map((step: LearningPathStep, index: number) => {
                  const accessBadge = getAccessBadge(step.accessStatus);
                  const isAccessible = step.accessStatus === "ACCESSIBLE";

                  return (
                    <div
                      key={step.id || index}
                      className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 transition-all flex flex-col gap-2.5 shadow-sm"
                    >
                      {/* Top Step Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">{getStepIcon(step.stepType)}</span>
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                            Step {index + 1} • {getStepTypeLabel(step.stepType)}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${accessBadge.classes}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{accessBadge.icon}</span>
                          {accessBadge.label}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-label-lg text-label-lg font-semibold text-primary">
                          {step.title}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          {step.description}
                        </p>
                      </div>

                      {/* Data-backed Rationale Card */}
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">
                          lightbulb
                        </span>
                        <p className="text-[12px] text-on-surface leading-snug">
                          <strong className="font-semibold text-primary">Rationale: </strong>
                          {step.reason}
                        </p>
                      </div>

                      {/* Footer Actions & Navigation */}
                      <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          {step.reference.courseTitle && (
                            <span className="truncate max-w-[220px]">
                              Course: <strong>{step.reference.courseTitle}</strong>
                            </span>
                          )}
                          {step.targetSkill && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-medium text-outline">
                              Skill: {step.targetSkill.name}
                            </span>
                          )}
                        </div>

                        <Link
                          href={step.actionUrl}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all shadow-sm ${
                            isAccessible
                              ? "bg-primary text-on-primary hover:opacity-90"
                              : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                          }`}
                        >
                          <span>{isAccessible ? "Start Now" : "View Details"}</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
