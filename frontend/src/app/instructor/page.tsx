"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Send,
  Trash2,
  Users,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
  Sparkles,
  Layers,
  Video,
  FileText,
  Loader2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api";
import { Course, Category } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface SectionLesson {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  contentType: string;
  durationSeconds: number;
  videoUrl?: string;
  content?: string;
  isFreePreview: boolean;
  orderIndex: number;
}

interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessons?: SectionLesson[];
}

export default function InstructorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PUBLISHED" | "PENDING_REVIEW" | "DRAFT">("ALL");

  // Create course modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    difficultyLevel: "Beginner",
    price: 0,
    learningOutcomes: "",
  });

  // Action status state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Student roster modal state
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterData, setRosterData] = useState<CourseEnrollment[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Curriculum Management Studio state
  const [curriculumCourse, setCurriculumCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [submittingSection, setSubmittingSection] = useState(false);
  const [showAddLessonSectionId, setShowAddLessonSectionId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"VIDEO" | "TEXT" | "DOCUMENT">("VIDEO");
  const [newLessonDuration, setNewLessonDuration] = useState(15);
  const [newLessonUrl, setNewLessonUrl] = useState("");
  const [newLessonContent, setNewLessonContent] = useState("");
  const [submittingLesson, setSubmittingLesson] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/instructor/courses`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load courses (${res.status})`);
      }
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to load instructor courses");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [coursesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/instructor/courses`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/categories`),
        ]);

        if (!coursesRes.ok) {
          throw new Error(`Failed to load courses (${coursesRes.status})`);
        }

        const coursesData = await coursesRes.json();
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];

        if (active) {
          setCourses(Array.isArray(coursesData) ? coursesData : []);
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          if (categoriesData.length > 0) {
            setNewCourse((prev) => ({ ...prev, categoryId: categoriesData[0].id }));
          }
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to load instructor courses");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Submit course for moderation
  const handleSubmitForReview = async (courseId: string) => {
    try {
      setActionLoadingId(courseId);
      setActionMessage(null);
      const res = await fetch(`${API_BASE}/instructor/courses/${courseId}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Course cannot be submitted. Check description and curriculum completeness.");
      }
      setActionMessage({ text: "Course successfully submitted for administrative review!", type: "success" });
      await fetchCourses();
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setActionMessage({ text: msg || "Failed to submit course", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete draft/rejected course
  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      setActionLoadingId(courseId);
      setActionMessage(null);
      const res = await fetch(`${API_BASE}/instructor/courses/${courseId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unable to delete course.");
      }
      setActionMessage({ text: "Course draft deleted successfully.", type: "success" });
      await fetchCourses();
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setActionMessage({ text: msg || "Deletion failed", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // View enrolled student roster
  const handleViewRoster = async (course: Course) => {
    setRosterCourse(course);
    setRosterLoading(true);
    setRosterError(null);
    setRosterData([]);
    try {
      const res = await fetch(`${API_BASE}/instructor/courses/${course.id}/enrollments`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Could not retrieve enrolled students for this course.");
      }
      const data = await res.json();
      setRosterData(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setRosterError(msg || "Could not retrieve enrolled students");
    } finally {
      setRosterLoading(false);
    }
  };

  // Open Curriculum Management Studio
  const handleOpenCurriculum = async (course: Course) => {
    setCurriculumCourse(course);
    setLoadingCurriculum(true);
    setCurriculumError(null);
    setSections([]);
    try {
      const res = await fetch(`${API_BASE}/instructor/courses/${course.id}/sections`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Could not retrieve curriculum sections.");
      const sectionsData: CourseSection[] = await res.json();

      // Fetch lessons for each section concurrently
      const fullSections = await Promise.all(
        sectionsData.map(async (sec) => {
          try {
            const lRes = await fetch(`${API_BASE}/instructor/sections/${sec.id}/lessons`, {
              headers: getAuthHeaders(),
            });
            const lessonsData = lRes.ok ? await lRes.json() : [];
            return { ...sec, lessons: lessonsData };
          } catch {
            return { ...sec, lessons: [] };
          }
        })
      );

      setSections(fullSections);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setCurriculumError(msg || "Failed to load curriculum sections.");
    } finally {
      setLoadingCurriculum(false);
    }
  };

  // Add a new section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curriculumCourse || !newSectionTitle.trim()) return;
    try {
      setSubmittingSection(true);
      const res = await fetch(`${API_BASE}/instructor/courses/${curriculumCourse.id}/sections`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSectionTitle.trim(),
          orderIndex: sections.length,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add curriculum section.");
      }
      const created: CourseSection = await res.json();
      setSections((prev) => [...prev, { ...created, lessons: [] }]);
      setNewSectionTitle("");
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Could not add section.");
    } finally {
      setSubmittingSection(false);
    }
  };

  // Delete a section
  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section and all lessons within it?")) return;
    try {
      const res = await fetch(`${API_BASE}/instructor/sections/${sectionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Could not delete section.");
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Failed to delete section.");
    }
  };

  // Add a lesson to a section
  const handleCreateLesson = async (sectionId: string) => {
    if (!newLessonTitle.trim()) {
      alert("Lesson title is required.");
      return;
    }
    try {
      setSubmittingLesson(true);
      const res = await fetch(`${API_BASE}/instructor/sections/${sectionId}/lessons`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          contentType: newLessonType,
          durationSeconds: Number(newLessonDuration) * 60,
          videoUrl: newLessonUrl.trim() || undefined,
          content: newLessonContent.trim() || undefined,
          isFreePreview: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create lesson.");
      }
      const createdLesson: SectionLesson = await res.json();
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, lessons: [...(s.lessons || []), createdLesson] } : s
        )
      );
      setNewLessonTitle("");
      setNewLessonUrl("");
      setNewLessonContent("");
      setShowAddLessonSectionId(null);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Could not add lesson.");
    } finally {
      setSubmittingLesson(false);
    }
  };

  // Delete a lesson
  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetch(`${API_BASE}/instructor/lessons/${lessonId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Could not delete lesson.");
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: (s.lessons || []).filter((l) => l.id !== lessonId) }
            : s
        )
      );
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Failed to delete lesson.");
    }
  };

  // Create course submission handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (newCourse.title.trim().length < 5) {
      setCreateError("Course title must be at least 5 characters.");
      return;
    }
    if (newCourse.description.trim().length < 20) {
      setCreateError("Course description must be at least 20 characters.");
      return;
    }
    if (!newCourse.categoryId) {
      setCreateError("Please select a primary category.");
      return;
    }

    try {
      setSubmittingCreate(true);
      const outcomes = newCourse.learningOutcomes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: newCourse.title.trim(),
        shortDescription: newCourse.shortDescription.trim() || undefined,
        description: newCourse.description.trim(),
        categoryId: newCourse.categoryId,
        difficultyLevel: newCourse.difficultyLevel,
        price: Number(newCourse.price) || 0,
        currency: "USD",
        learningOutcomes: outcomes.length > 0 ? outcomes : undefined,
      };

      const res = await fetch(`${API_BASE}/instructor/courses`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create course draft.");
      }

      setShowCreateModal(false);
      setNewCourse({
        title: "",
        shortDescription: "",
        description: "",
        categoryId: categories[0]?.id || "",
        difficultyLevel: "Beginner",
        price: 0,
        learningOutcomes: "",
      });
      setActionMessage({ text: "New course draft created successfully! You can now configure sections and lessons.", type: "success" });
      await fetchCourses();
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setCreateError(msg || "Failed to create course");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PUBLISHED") return c.status === "PUBLISHED";
    if (activeTab === "PENDING_REVIEW") return c.status === "PENDING_REVIEW";
    if (activeTab === "DRAFT") return c.status === "DRAFT" || c.status === "REJECTED";
    return true;
  });

  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;
  const pendingCount = courses.filter((c) => c.status === "PENDING_REVIEW").length;
  const draftCount = courses.filter((c) => c.status === "DRAFT" || c.status === "REJECTED").length;

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Faculty Management Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Instructor Course Studio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Design university curriculum, add video lectures and reading modules, track student cohort rosters, and submit courses for moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCourses()}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Refresh courses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Propose New Course</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Total Authored
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{courses.length}</div>
          <span className="text-[11px] text-slate-400 mt-1">all active course records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Live on Registry
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{publishedCount}</div>
          <span className="text-[11px] text-emerald-600 mt-1">open for public enrollment</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Under Review
          </span>
          <div className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</div>
          <span className="text-[11px] text-amber-600 mt-1">pending registrar approval</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Drafts &amp; Revisions
          </span>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{draftCount}</div>
          <span className="text-[11px] text-indigo-600 mt-1">in editing or revision</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(["ALL", "PUBLISHED", "PENDING_REVIEW", "DRAFT"] as const).map((tab) => {
          const labels = {
            ALL: `All Courses (${courses.length})`,
            PUBLISHED: `Published (${publishedCount})`,
            PENDING_REVIEW: `Under Review (${pendingCount})`,
            DRAFT: `Drafts (${draftCount})`,
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-sm font-medium">Synchronizing authored curriculum records…</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">No courses match this filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Propose a new course proposal to begin authoring curriculum sections and lessons.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course Draft</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isActing = actionLoadingId === course.id;
            const priceDisplay = Number(course.price) === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`;

            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        course.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700"
                          : course.status === "PENDING_REVIEW"
                          ? "bg-amber-100 text-amber-700"
                          : course.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {course.status}
                    </span>

                    {course.category && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                        {typeof course.category === "object" ? course.category.name : course.category}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                      {course.difficultyLevel}
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                      {priceDisplay}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {course.shortDescription || course.description}
                  </p>

                  {/* Rejection feedback alert */}
                  {course.status === "REJECTED" && course.rejectionReason && (
                    <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Registrar Moderation Feedback:
                      </span>
                      <p>{course.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Course Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-5">
                  {/* Curriculum Studio button */}
                  <button
                    onClick={() => handleOpenCurriculum(course)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Curriculum Studio</span>
                  </button>

                  {/* View public course */}
                  {course.status === "PUBLISHED" && (
                    <Link
                      href={`/courses/${course.slug || course.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Public View</span>
                    </Link>
                  )}

                  {/* View student roster */}
                  <button
                    onClick={() => handleViewRoster(course)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Roster</span>
                  </button>

                  {/* Submit for review (Draft or Rejected) */}
                  {(course.status === "DRAFT" || course.status === "REJECTED") && (
                    <button
                      onClick={() => handleSubmitForReview(course.id)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isActing ? "Submitting..." : "Submit for Review"}</span>
                    </button>
                  )}

                  {/* Delete Draft/Rejected */}
                  {(course.status === "DRAFT" || course.status === "REJECTED") && (
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      disabled={isActing}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete draft course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Curriculum Management Studio Modal */}
      {curriculumCourse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Curriculum Studio
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {curriculumCourse.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mt-1">
                  {curriculumCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setCurriculumCourse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingCurriculum ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-medium">Loading syllabus structure…</p>
                </div>
              ) : curriculumError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {curriculumError}
                </div>
              ) : (
                <>
                  {/* Add Section Form */}
                  <form onSubmit={handleCreateSection} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Section Title (e.g. Module 1: Foundations & Architecture)..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingSection || !newSectionTitle.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Section</span>
                    </button>
                  </form>

                  {/* Sections List */}
                  {sections.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No sections added yet</p>
                      <p className="text-[11px] text-slate-400">
                        Create your first curriculum section above to start attaching lessons.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sections.map((sec, idx) => (
                        <div
                          key={sec.id}
                          className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3"
                        >
                          {/* Section Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h4 className="font-semibold text-sm text-slate-900">{sec.title}</h4>
                              <span className="text-[11px] text-slate-400">
                                ({sec.lessons?.length || 0} lessons)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddLessonSectionId(
                                    showAddLessonSectionId === sec.id ? null : sec.id
                                  )
                                }
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Lesson</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sec.id)}
                                className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Add Lesson Form Inline */}
                          {showAddLessonSectionId === sec.id && (
                            <div className="p-4 bg-white border border-indigo-200 rounded-lg space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-700">Add New Lesson</span>
                                <button
                                  type="button"
                                  onClick={() => setShowAddLessonSectionId(null)}
                                  className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  placeholder="Lesson title..."
                                  value={newLessonTitle}
                                  onChange={(e) => setNewLessonTitle(e.target.value)}
                                  className="sm:col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded"
                                />
                                <select
                                  value={newLessonType}
                                  onChange={(e) =>
                                    setNewLessonType(e.target.value as "VIDEO" | "TEXT" | "DOCUMENT")
                                  }
                                  className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                                >
                                  <option value="VIDEO">Video Lecture</option>
                                  <option value="TEXT">Reading Article</option>
                                  <option value="DOCUMENT">PDF / Document</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Video/Resource URL (optional)..."
                                  value={newLessonUrl}
                                  onChange={(e) => setNewLessonUrl(e.target.value)}
                                  className="px-3 py-1.5 text-xs border border-slate-300 rounded"
                                />
                                <input
                                  type="number"
                                  placeholder="Duration in minutes (e.g. 15)"
                                  value={newLessonDuration}
                                  onChange={(e) => setNewLessonDuration(Number(e.target.value) || 10)}
                                  className="px-3 py-1.5 text-xs border border-slate-300 rounded"
                                />
                              </div>
                              <textarea
                                rows={2}
                                placeholder="Lesson syllabus notes or reading text..."
                                value={newLessonContent}
                                onChange={(e) => setNewLessonContent(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateLesson(sec.id)}
                                disabled={submittingLesson || !newLessonTitle.trim()}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50 cursor-pointer"
                              >
                                {submittingLesson ? "Saving Lesson…" : "Save Lesson to Section"}
                              </button>
                            </div>
                          )}

                          {/* Lessons in Section */}
                          {(!sec.lessons || sec.lessons.length === 0) ? (
                            <p className="text-[11px] text-slate-400 italic pl-8">
                              No lessons yet in this section. Click &ldquo;Add Lesson&rdquo; above.
                            </p>
                          ) : (
                            <div className="space-y-1.5 pl-8">
                              {sec.lessons.map((lesson, lIdx) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/80 hover:border-slate-300 transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      {lIdx + 1}.
                                    </span>
                                    {lesson.contentType === "VIDEO" ? (
                                      <Video className="w-3.5 h-3.5 text-indigo-500" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                    )}
                                    <span className="font-medium text-slate-800">{lesson.title}</span>
                                    <span className="text-[10px] text-slate-400">
                                      ({Math.round((lesson.durationSeconds || 600) / 60)} min)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(sec.id, lesson.id)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                    title="Delete Lesson"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                All changes synchronize directly with the university course catalogue.
              </span>
              <button
                onClick={() => setCurriculumCourse(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {rosterCourse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Enrolled Student Cohort</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rosterCourse.title}</p>
              </div>
              <button
                onClick={() => setRosterCourse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {rosterLoading ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs">Synchronizing active student enrollments…</p>
                </div>
              ) : rosterError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {rosterError}
                </div>
              ) : rosterData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No students currently enrolled</p>
                  <p className="text-xs opacity-70">
                    Once published, student registrations will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rosterData.map((enr) => (
                    <div key={enr.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {enr.user?.name || "Student Scholar"}
                        </p>
                        <p className="text-xs text-slate-400">{enr.user?.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {enr.status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Enrolled {new Date(enr.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">{rosterData.length} students enrolled</span>
              <button
                onClick={() => setRosterCourse(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Propose New Academic Course</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates a draft syllabus. You can refine curriculum and add lessons before submitting.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 overflow-y-auto flex-1 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title <span className="text-red-500">* (Min 5 chars)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus & Raft Architecture"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCourse.categoryId}
                    onChange={(e) => setNewCourse({ ...newCourse, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={newCourse.difficultyLevel}
                    onChange={(e) => setNewCourse({ ...newCourse, difficultyLevel: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tuition Fee (USD, 0 for Free)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCourse.price}
                  onChange={(e) => setNewCourse({ ...newCourse, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Subtitle
                </label>
                <input
                  type="text"
                  placeholder="A concise summary of key skills taught"
                  value={newCourse.shortDescription}
                  onChange={(e) => setNewCourse({ ...newCourse, shortDescription: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Syllabus &amp; Overview <span className="text-red-500">* (Min 20 chars)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Comprehensive description of topics, prerequisites, and learning methodology..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Learning Outcomes (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Master enterprise architectural patterns&#10;Design fault-tolerant distributed pipelines"
                  value={newCourse.learningOutcomes}
                  onChange={(e) => setNewCourse({ ...newCourse, learningOutcomes: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingCreate ? "Creating..." : "Save Draft Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
