"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CourseCard } from "@/components/course/CourseCard";
import { Course, Category } from "@/types";
import { apiFetch } from "@/lib/api";
import {
  Search,
  BookOpen,
  GraduationCap,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Users,
  Compass,
  Layers,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCourses, setTotalCourses] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    let active = true;

    async function loadCatalogue() {
      try {
        const [coursesRes, categoriesRes] = await Promise.all([
          apiFetch<{ data: Course[]; meta: { total: number } }>("/courses?limit=8&status=PUBLISHED"),
          apiFetch<Category[] | { data: Category[] }>("/categories"),
        ]);

        if (active) {
          if (coursesRes && Array.isArray(coursesRes.data)) {
            setCourses(coursesRes.data);
            setTotalCourses(coursesRes.meta?.total || coursesRes.data.length);
          }
          if (Array.isArray(categoriesRes)) {
            setCategories(categoriesRes);
          } else if (categoriesRes && Array.isArray((categoriesRes as { data: Category[] }).data)) {
            setCategories((categoriesRes as { data: Category[] }).data);
          }
        }
      } catch {
        // If error occurs, keep empty state gracefully
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCatalogue();

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/courses");
    }
  };

  const filteredCourses =
    selectedCategory === "ALL"
      ? courses
      : courses.filter((c) => {
          if (typeof c.category === "object" && c.category !== null) {
            return c.category.id === selectedCategory || c.category.name === selectedCategory;
          }
          return c.category === selectedCategory;
        });

  return (
    <>
      <Header />
      <main className="w-full pt-16 bg-surface min-h-screen">
        {/* Top Registry Status Strip */}
        <div className="w-full bg-surface-container-low border-b border-surface-variant/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-on-surface">Academic Term 2026</span>
              <span className="text-outline-variant">•</span>
              <span>Online Learning Registry Active</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{totalCourses > 0 ? `${totalCourses} Accredited Courses Published` : "Accredited Catalog"}</span>
              <Link href="/verify" className="text-primary hover:underline font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verify Credential</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-lowest via-surface to-surface-container-low border-b border-surface-variant/40 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>University-Grade Online Curriculum</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
                  Master New Skills with Certified Academic Courses
                </h1>

                <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-2xl">
                  Explore verified, structured coursework designed by university faculty and industry experts. Gain practical knowledge, complete assessed milestones, and earn verifiable cryptographic certificates.
                </p>

                {/* Omnibox Search Bar */}
                <form onSubmit={handleSearch} className="relative max-w-2xl">
                  <div className="relative flex items-center shadow-lg rounded-xl overflow-hidden border border-outline-variant/60 bg-surface">
                    <Search className="w-5 h-5 absolute left-4 text-on-surface-variant" />
                    <input
                      id="catalogue-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search courses by keyword, instructor, or subject..."
                      className="w-full pl-12 pr-32 py-4 bg-transparent text-on-surface placeholder:text-outline text-sm sm:text-base focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-semibold text-sm rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      Search
                    </button>
                  </div>
                </form>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-surface-variant/40 max-w-lg">
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-primary">230+</div>
                    <div className="text-xs text-on-surface-variant font-medium mt-0.5">Published Courses</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-primary">100%</div>
                    <div className="text-xs text-on-surface-variant font-medium mt-0.5">Verified Completion</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-primary">ISO</div>
                    <div className="text-xs text-on-surface-variant font-medium mt-0.5">Verifiable Credentials</div>
                  </div>
                </div>
              </div>

              {/* Featured Showcase Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl p-6 bg-surface-container-lowest border border-outline-variant/50 shadow-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Featured Course
                    </span>
                    <span className="text-xs font-mono text-outline">OCMS-DEMO-01</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Full-Stack Modern Web Engineering</h3>
                    <p className="text-xs text-on-surface-variant mt-2 line-clamp-3">
                      Master modern web architectures: Next.js 15, TypeScript, NestJS microservices, TypeORM, and secure production deployment patterns. Includes hands-on interactive quizzes and verifiable credentials.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-surface-variant/40 text-xs text-on-surface-variant">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span>Instructed by Dr. Alan Turing</span>
                      </span>
                      <span className="font-semibold text-emerald-600">Free Enrollment</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Includes Verified Certificate</span>
                      </span>
                      <span>12 Modules • 4 Quizzes</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/courses/full-stack-web-development-demo"
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-semibold text-sm transition-colors shadow-sm"
                    >
                      <span>Explore Demo Course</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Catalog Section */}
        <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-surface-variant/40">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Compass className="w-4 h-4" />
                <span>Academic Directory</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
                Explore Available Courses
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Select a subject area or browse our complete active course catalogue.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
            >
              <span>View All Catalog Courses ({totalCourses || courses.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category Filter Chips */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                }`}
              >
                All Subjects
              </button>
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Courses Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-72 rounded-xl bg-surface-container-low border border-outline-variant/30" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/40 space-y-4">
              <BookOpen className="w-12 h-12 text-outline mx-auto" />
              <h3 className="text-lg font-semibold text-on-surface">No courses found in this category</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                Try selecting &ldquo;All Subjects&rdquo; or explore our full catalogue with search filters.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container"
              >
                <span>Browse Full Catalogue</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>

        {/* Platform Pillars Section */}
        <section className="bg-surface-container-low py-16 border-t border-surface-variant/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                Built for Complete Academic Excellence
              </h2>
              <p className="text-sm text-on-surface-variant mt-2">
                Designed to support scholars, instructors, and university administrators with robust educational tooling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Student Mastery Journey</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Interactive video and reading lessons, modular curriculum progression tracking, self-paced quizzes, and instant pass/fail evaluation.
                </p>
                <Link href="/student" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2">
                  <span>Open Student Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Instructor Course Studio</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Create rich multi-section syllabi, manage lesson contents, design quizzes, track student enrollment engagement, and submit courses for moderation.
                </p>
                <Link href="/instructor" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2">
                  <span>Instructor Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Cryptographic Verification</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Every issued certificate receives a unique tamper-proof identifier accessible through our public registry ledger.
                </p>
                <Link href="/verify" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2">
                  <span>Verify a Credential</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
