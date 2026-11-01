"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { apiFetch } from "@/lib/api";
import { Course, Category } from "@/types";
import {
  Search,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
} from "lucide-react";

interface CoursesResponse {
  data: Course[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function CoursesCatalogueContent() {
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState<CoursesResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(searchParams.get("categorySlug") || "");
  const [difficultyLevel, setDifficultyLevel] = useState(searchParams.get("level") || "");
  const [isFree, setIsFree] = useState<string>(searchParams.get("isFree") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  // Load categories
  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then((cats) => setCategories(cats || []))
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "9");

      if (search.trim()) params.set("search", search.trim());
      if (selectedCategorySlug) params.set("categorySlug", selectedCategorySlug);
      if (difficultyLevel) params.set("difficultyLevel", difficultyLevel);
      if (isFree === "true") params.set("isFree", "true");
      if (sort) params.set("sort", sort);

      const res = await apiFetch<CoursesResponse>(`/courses?${params.toString()}`);
      setCourses(res.data || []);
      setMeta(res.meta);
      setPage(targetPage);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to load courses from catalog.");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategorySlug, difficultyLevel, isFree, sort]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "9");
    if (search.trim()) params.set("search", search.trim());
    if (selectedCategorySlug) params.set("categorySlug", selectedCategorySlug);
    if (difficultyLevel) params.set("difficultyLevel", difficultyLevel);
    if (isFree === "true") params.set("isFree", "true");
    if (sort) params.set("sort", sort);

    apiFetch<CoursesResponse>(`/courses?${params.toString()}`)
      .then((res) => {
        if (active) {
          setCourses(res.data || []);
          setMeta(res.meta);
          setPage(1);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to load courses from catalog.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, selectedCategorySlug, difficultyLevel, isFree, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourses(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategorySlug("");
    setDifficultyLevel("");
    setIsFree("");
    setSort("newest");
    setPage(1);
  };

  return (
    <>
      <Header />
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-16rem)] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Header Section */}
          <header className="mb-8 border-b border-surface-variant/40 pb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                    Academic Term 2025–2026
                  </span>
                  <span className="text-outline text-body-sm">•</span>
                  <span className="font-code-sm text-code-sm text-outline">Registry Verified</span>
                </div>
                <h1 className="font-display-lg text-display-lg text-primary tracking-tight font-bold">
                  Explore Courses
                </h1>
                <p className="font-body-md text-on-surface-variant max-w-2xl mt-1">
                  Browse accredited curriculum modules, foundational tracks, and specialized seminars across department disciplines.
                </p>
              </div>

              {meta && (
                <div className="text-sm font-medium text-slate-500 bg-surface-container-low px-3 py-1.5 rounded-lg self-start md:self-auto border border-surface-variant/40">
                  <span className="font-semibold text-primary">{meta.total}</span> total courses available
                </div>
              )}
            </div>

            {/* Quick Discipline Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none text-nowrap">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline mr-2 shrink-0">
                Disciplines:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategorySlug("")}
                className={`px-3 py-1 rounded text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategorySlug === ""
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-lowest hover:bg-surface-container border border-surface-variant text-on-surface-variant"
                }`}
              >
                All Disciplines
              </button>
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategorySlug(cat.slug)}
                  className={`px-3 py-1 rounded text-xs font-semibold shrink-0 transition-colors ${
                    selectedCategorySlug === cat.slug
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-lowest hover:bg-surface-container border border-surface-variant text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </header>

          {/* Discovery Grid with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Filter Sidebar */}
            <aside className="lg:col-span-1 bg-surface-container-lowest p-5 rounded-xl border border-surface-variant space-y-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-surface-variant">
                <span className="font-label-md text-sm text-on-surface uppercase tracking-wider font-bold">
                  Filters
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="font-label-sm text-xs text-outline hover:text-primary underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold block">
                  Category
                </label>
                <select
                  value={selectedCategorySlug}
                  onChange={(e) => setSelectedCategorySlug(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-surface-variant" />

              {/* Difficulty Level */}
              <div className="space-y-2">
                <label className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold block">
                  Academic Level
                </label>
                <div className="space-y-1.5 text-sm">
                  {[
                    { label: "All Levels", value: "" },
                    { label: "Beginner", value: "Beginner" },
                    { label: "Intermediate", value: "Intermediate" },
                    { label: "Advanced", value: "Advanced" },
                  ].map((lvl) => (
                    <label key={lvl.value} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="difficulty"
                        value={lvl.value}
                        checked={difficultyLevel === lvl.value}
                        onChange={() => setDifficultyLevel(lvl.value)}
                        className="accent-primary"
                      />
                      <span>{lvl.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-surface-variant" />

              {/* Tuition / Price Filter */}
              <div className="space-y-2">
                <label className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold block">
                  Tuition &amp; Enrolment
                </label>
                <div className="space-y-1.5 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="pricing"
                      value=""
                      checked={isFree === ""}
                      onChange={() => setIsFree("")}
                      className="accent-primary"
                    />
                    <span>All Offerings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="pricing"
                      value="true"
                      checked={isFree === "true"}
                      onChange={() => setIsFree("true")}
                      className="accent-primary"
                    />
                    <span>Open Audit / Free Only</span>
                  </label>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <section className="lg:col-span-3 space-y-6">
              {/* Search & Sort Controls */}
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-variant flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                  <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    placeholder="Search by course title, keyword, or instructor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-variant rounded-lg pl-9 pr-20 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container"
                  >
                    Search
                  </button>
                </form>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="sort-select" className="text-xs text-on-surface-variant font-medium">
                    Sort:
                  </label>
                  <select
                    id="sort-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="bg-surface-container-low border border-surface-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="newest">Recently Added</option>
                    <option value="title">Course Title (A–Z)</option>
                    <option value="price_asc">Tuition: Low to High</option>
                    <option value="price_desc">Tuition: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Course Results */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="bg-surface-container-lowest rounded-xl p-5 border border-surface-variant animate-pulse flex flex-col gap-3"
                    >
                      <div className="h-40 bg-surface-container rounded-lg w-full" />
                      <div className="h-4 bg-surface-container rounded w-3/4 mt-2" />
                      <div className="h-3 bg-surface-container rounded w-1/2" />
                      <div className="h-12 bg-surface-container rounded w-full mt-auto" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 rounded-xl bg-error-container/20 border border-error/20 text-error text-center">
                  <p className="font-semibold">{error}</p>
                  <button
                    onClick={() => fetchCourses(1)}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : courses.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-surface-variant">
                  <BookOpen className="w-12 h-12 text-outline mx-auto mb-3 opacity-40" />
                  <h3 className="font-title-md text-on-surface font-semibold">No Courses Found</h3>
                  <p className="font-body-sm text-on-surface-variant text-sm mt-1 max-w-md mx-auto">
                    No catalogue courses match the current search filters. Try clearing your search keyword or selected discipline.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {courses.map((course) => {
                    const priceNum = Number(course.price || 0);
                    const isCourseFree = priceNum === 0;
                    const catName =
                      typeof course.category === "object"
                        ? course.category?.name
                        : course.category || "General Studies";

                    return (
                      <article
                        key={course.id}
                        className="bg-surface-container-lowest rounded-xl border border-surface-variant hover:border-primary transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-xs hover:shadow-md"
                      >
                        <div>
                          {/* Course Thumbnail */}
                          <div className="relative aspect-video overflow-hidden bg-surface-container">
                            {course.thumbnailUrl || course.thumbnail ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={course.thumbnailUrl || course.thumbnail}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                <BookOpen className="w-12 h-12 opacity-30" />
                              </div>
                            )}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-surface-container-lowest/95 backdrop-blur-xs font-label-sm text-[11px] text-primary font-bold border border-surface-variant">
                              {catName}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-outline">
                              <span>{course.difficultyLevel || course.level || "All Levels"}</span>
                              {course.estimatedDuration && (
                                <span>{course.estimatedDuration} hrs</span>
                              )}
                            </div>

                            <Link href={`/courses/${course.id}`}>
                              <h3 className="font-title-md text-base text-on-surface group-hover:text-primary transition-colors font-bold line-clamp-2">
                                {course.title}
                              </h3>
                            </Link>

                            <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                              {course.shortDescription || course.description}
                            </p>

                            <p className="font-code-sm text-[11px] text-outline pt-1 truncate">
                              Instructor: {course.instructorName || course.instructor?.fullName || "Faculty Staff"}
                            </p>
                          </div>
                        </div>

                        {/* Footer & Price */}
                        <div className="p-4 pt-0 space-y-3">
                          <div className="pt-2 border-t border-surface-variant/40 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-semibold text-outline">
                                Tuition
                              </span>
                              <span className="font-title-md font-bold text-primary">
                                {isCourseFree ? "Free" : `$${priceNum.toFixed(2)}`}
                              </span>
                            </div>

                            <Link
                              href={`/courses/${course.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-xs font-semibold transition-colors border border-surface-variant"
                            >
                              <span>View Syllabus</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <nav
                  aria-label="Catalogue pagination"
                  className="mt-6 pt-6 border-t border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="font-body-sm text-xs text-on-surface-variant">
                    Showing page <span className="font-semibold text-on-surface">{meta.page}</span> of{" "}
                    <span className="font-semibold text-on-surface">{meta.totalPages}</span> ({meta.total} total courses)
                  </div>

                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => fetchCourses(page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-surface-variant bg-surface-container-low text-xs font-medium text-slate-700 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <span className="px-3 py-1 rounded bg-primary text-on-primary text-xs font-bold">
                      {meta.page}
                    </span>

                    <button
                      type="button"
                      disabled={page >= meta.totalPages || loading}
                      onClick={() => fetchCourses(page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-surface-variant bg-surface-container-low text-xs font-medium text-slate-700 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </nav>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CoursesCataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CoursesCatalogueContent />
    </Suspense>
  );
}
