"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  BookOpen,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  courses?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteModalCategory, setDeleteModalCategory] = useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<CategoryItem[]>("/admin/categories");
      setCategories(data || []);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<CategoryItem[]>("/admin/categories")
      .then((data) => {
        if (active) {
          setCategories(data || []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to load categories.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Handle open create modal
  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setFormName("");
    setFormDescription("");
    setFormSlug("");
    setFormError(null);
    setModalMode("CREATE");
  };

  // Handle open edit modal
  const handleOpenEdit = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormSlug(cat.slug);
    setFormError(null);
    setModalMode("EDIT");
  };

  // Auto-slugify when typing name in create mode
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (modalMode === "CREATE") {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormSlug(generatedSlug);
    }
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Category name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (modalMode === "CREATE") {
        await apiFetch("/admin/categories", {
          method: "POST",
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || undefined,
          }),
        });
        setSuccessMessage(`Category "${formName.trim()}" created successfully.`);
      } else if (modalMode === "EDIT" && selectedCategory) {
        await apiFetch(`/admin/categories/${selectedCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || undefined,
          }),
        });
        setSuccessMessage(`Category "${formName.trim()}" updated successfully.`);
      }

      setModalMode(null);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setFormError(msg || "Operation failed. Please verify input values.");
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Category Deletion
  const handleConfirmDelete = async () => {
    if (!deleteModalCategory) return;

    try {
      setDeleting(true);
      await apiFetch(`/admin/categories/${deleteModalCategory.id}`, {
        method: "DELETE",
      });

      setSuccessMessage(`Category "${deleteModalCategory.name}" was deleted successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setDeleteModalCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(
        msg ||
          "Cannot delete category: it may be referenced by existing courses or system records."
      );
      setDeleteModalCategory(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-6 h-6 text-red-600" />
            Category Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize academic disciplines, courses taxonomy, and departmental faculties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-red-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name, slug, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Slug Identifier</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Courses Linked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
                    <span>Loading categories...</span>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Folder className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No categories found matching query</p>
                    <p className="text-xs text-slate-400 mt-1">Try adding a new category above.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const courseCount = Array.isArray(cat.courses) ? cat.courses.length : 0;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 border border-red-100">
                            <Folder className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-900">{cat.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {cat.slug}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {cat.description || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          {courseCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit category"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteModalCategory(cat)}
                            title="Delete category"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalMode === "CREATE" ? "Create New Category" : "Edit Category"}
              </h3>
              <button
                disabled={submitting}
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slug (URL Identifier)
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. computer-science"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of this academic discipline..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === "CREATE" ? "Create Category" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-rose-950">Delete Category</h3>
              <button
                disabled={deleting}
                onClick={() => setDeleteModalCategory(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-600 space-y-3">
              <p>
                Are you sure you want to delete category{" "}
                <strong className="text-slate-900">{deleteModalCategory.name}</strong>?
              </p>
              <p className="text-slate-500">
                Note: If any active courses are currently categorized under this discipline, the deletion
                will be safely rejected by the database to preserve course integrity.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModalCategory(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? "Deleting..." : "Delete Category"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
