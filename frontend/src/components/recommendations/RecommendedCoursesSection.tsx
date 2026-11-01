"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RecommendationResponse, RecommendedCourseItem } from "@/types";
import { apiFetch, getAuthToken } from "@/lib/api";

export default function RecommendedCoursesSection() {
  const [recommendations, setRecommendations] = useState<RecommendedCourseItem[]>([]);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<RecommendationResponse>("/recommendations/me?limit=4");
      setRecommendations(result.data || []);
      setIsFallback(result.meta?.isFallback ?? false);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg = (err as { message?: string })?.message;
      if (status === 401) {
        setRecommendations([]);
      } else {
        setError(msg || "Failed to load smart recommendations");
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

    apiFetch<RecommendationResponse>("/recommendations/me?limit=4")
      .then((result) => {
        if (active) {
          setRecommendations(result.data || []);
          setIsFallback(result.meta?.isFallback ?? false);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const status = (err as { status?: number })?.status;
        const msg = (err as { message?: string })?.message;
        if (status === 401) {
          setRecommendations([]);
        } else {
          setError(msg || "Failed to load smart recommendations");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-space-md pt-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm border-b border-outline-variant/30 gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-headline-sm text-primary">Recommended for You</h2>
              {isFallback && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-surface-container-high text-outline">
                  Discovery Track
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {isFallback
                ? "Popular foundational courses recommended to kickstart your learning pathway."
                : "Curated academic suggestions calculated from your completed coursework and topic interests."}
            </p>
          </div>
        </div>

        <Link
          href="/courses"
          className="flex items-center gap-1.5 text-primary hover:text-primary-container font-label-md text-label-md transition-colors self-start sm:self-auto"
        >
          <span>Browse Full Catalogue</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 animate-pulse flex flex-col gap-space-sm"
            >
              <div className="h-28 bg-surface-container rounded-lg w-full"></div>
              <div className="h-4 bg-surface-container rounded w-3/4 mt-2"></div>
              <div className="h-3 bg-surface-container rounded w-1/2"></div>
              <div className="h-6 bg-surface-container rounded w-full mt-auto"></div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm text-error">
            <span className="material-symbols-outlined text-[20px]">info</span>
            <span className="font-body-sm text-body-sm">{error}</span>
          </div>
          <button
            onClick={fetchRecommendations}
            className="px-3 py-1 rounded bg-surface-container-high text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="bg-surface-container-lowest p-space-lg rounded-xl text-center border border-outline-variant/30 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2">menu_book</span>
          <p className="font-title-md text-title-md text-primary font-medium">No Recommendations Available</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mt-1">
            Browse our course catalogue or enroll in beginner modules to build your personalized recommendation profile.
          </p>
          <Link
            href="/courses"
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
          >
            Explore Courses
          </Link>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {recommendations.map((item) => {
            const course = item.course;
            const price = Number(course.price || 0);
            const isFree = price === 0;

            return (
              <article
                key={course.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow border border-outline-variant/20 flex flex-col justify-between group"
              >
                <div>
                  {/* Category & Difficulty Header */}
                  <div className="flex items-center justify-between gap-2 mb-space-xs">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-secondary-fixed text-on-secondary-fixed truncate max-w-[140px]">
                      {typeof course.category === 'object' ? course.category?.name : course.category || "General"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-container-high text-outline">
                      {course.difficultyLevel || course.level || "All Levels"}
                    </span>
                  </div>

                  {/* Title */}
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="font-title-md text-title-md text-primary group-hover:text-primary-container transition-colors line-clamp-2 mt-1">
                      {course.title}
                    </h3>
                  </Link>

                  {/* Instructor & Metadata */}
                  <p className="font-code-sm text-code-sm text-outline mt-1 truncate">
                    {course.instructorName || course.instructor?.fullName || "Faculty Instructor"}
                  </p>

                  {/* Data-backed Recommendation Reason Pill */}
                  <div className="mt-space-sm p-2 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">
                      recommend
                    </span>
                    <p className="font-label-sm text-label-sm text-primary leading-snug line-clamp-2">
                      {item.reason}
                    </p>
                  </div>
                </div>

                {/* Footer with Price & Action */}
                <div className="pt-space-sm mt-space-md border-t border-surface-container-low flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline uppercase text-[10px]">Tuition</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">
                      {isFree ? "Free" : `$${price.toFixed(2)}`}
                    </span>
                  </div>

                  <Link
                    href={`/courses/${course.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-colors shadow-sm"
                  >
                    <span>View</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
