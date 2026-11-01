"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { UserRole } from "@/types";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Ban,
  UserCheck,
  Trash2,
  AlertTriangle,
  X,
  Shield,
  ShieldAlert,
  BookOpen,
  CreditCard,
  Award,
  GraduationCap,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  fullName: string;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING_VERIFICATION";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserImpactSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: string;
  stats: {
    coursesCount: number;
    enrollmentsCount: number;
    paymentsCount: number;
    certificatesCount: number;
  };
}

interface AdminUsersResponse {
  data: AdminUserItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [meta, setMeta] = useState<AdminUsersResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Current logged in admin info
  const [currentAdminId] = useState<string | null>(() => getStoredUser()?.id || null);

  // Suspend/Reactivate Modal State
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserItem | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  // Delete Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUserItem | null>(null);
  const [userSummary, setUserSummary] = useState<UserImpactSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", "15");
        if (search.trim()) params.set("search", search.trim());
        if (roleFilter !== "ALL") params.set("role", roleFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);

        const res = await apiFetch<AdminUsersResponse>(`/admin/users?${params.toString()}`);
        setUsers(res.data || []);
        setMeta(res.meta);
        setPage(targetPage);
      } catch (err: unknown) {
        const msg = (err as Error)?.message;
        setError(msg || "Failed to retrieve user accounts.");
      } finally {
        setLoading(false);
      }
    },
    [page, search, roleFilter, statusFilter]
  );

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "15");
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    apiFetch<AdminUsersResponse>(`/admin/users?${params.toString()}`)
      .then((res) => {
        if (active) {
          setUsers(res.data || []);
          setMeta(res.meta);
          setPage(1);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to retrieve user accounts.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, roleFilter, statusFilter]);

  // Open Suspend Confirmation Dialog
  const handleOpenSuspendModal = (user: AdminUserItem) => {
    setError(null);
    setSuspendModalUser(user);
  };

  // Execute Suspend or Reactivate
  const handleConfirmStatusToggle = async () => {
    if (!suspendModalUser) return;
    const nextStatus = suspendModalUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    try {
      setIsSuspending(true);
      await apiFetch(`/admin/users/${suspendModalUser.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === suspendModalUser.id ? { ...u, status: nextStatus } : u))
      );
      setSuccessMessage(
        `User ${suspendModalUser.email} has been successfully ${
          nextStatus === "ACTIVE" ? "reactivated" : "suspended"
        }.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      setSuspendModalUser(null);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to update user status.");
    } finally {
      setIsSuspending(false);
    }
  };

  // Open Delete Confirmation Dialog and fetch live relational summary
  const handleOpenDeleteModal = async (user: AdminUserItem) => {
    setError(null);
    setDeleteModalUser(user);
    setUserSummary(null);
    setDeleteConfirmed(false);
    setLoadingSummary(true);

    try {
      const summary = await apiFetch<UserImpactSummary>(`/admin/users/${user.id}/summary`);
      setUserSummary(summary);
    } catch {
      // Fallback empty stats if summary retrieval fails
      setUserSummary({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        stats: { coursesCount: 0, enrollmentsCount: 0, paymentsCount: 0, certificatesCount: 0 },
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalUser || !deleteConfirmed) return;

    try {
      setIsDeleting(true);
      const res = await apiFetch<{
        success: boolean;
        message: string;
        userId: string;
        deletionType: "SOFT_DELETED" | "PERMANENTLY_DELETED";
      }>(`/admin/users/${deleteModalUser.id}`, {
        method: "DELETE",
      });

      setSuccessMessage(res.message || `User ${deleteModalUser.email} was successfully processed.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh list to update counters and table rows
      setDeleteModalUser(null);
      await fetchUsers(page);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to delete user account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const isProtectedUser = (user: AdminUserItem) => {
    return user.email === "admin@ocms.com" || user.id === currentAdminId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-red-600" />
            User Account Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administer student, instructor, and staff accounts with enterprise-grade audit tracking.
          </p>
        </div>
        <button
          onClick={() => fetchUsers(page)}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-red-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="INSTRUCTOR">Instructors</option>
              <option value="ADMIN">Administrators</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive (Deactivated)</option>
              <option value="PENDING_VERIFICATION">Pending</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
                    <span>Loading platform users...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-600">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    <span>{error}</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No users found matching query</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search criteria.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === "SUSPENDED";
                  const isInactive = u.status === "INACTIVE";
                  const isProtected = isProtectedUser(u);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isInactive ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-inner ${
                              u.role === "ADMIN"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : u.role === "INSTRUCTOR"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {(u.fullName || u.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900">
                                {u.fullName || "Unnamed User"}
                              </p>
                              {isProtected && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Shield className="w-3 h-3" />
                                  Protected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            u.role === "ADMIN"
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : u.role === "INSTRUCTOR"
                              ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : u.status === "SUSPENDED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : u.status === "INACTIVE"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-500"
                                : u.status === "SUSPENDED"
                                ? "bg-rose-500"
                                : u.status === "INACTIVE"
                                ? "bg-slate-400"
                                : "bg-amber-500"
                            }`}
                          />
                          {u.status === "INACTIVE" ? "DEACTIVATED" : u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isProtected ? (
                            <span className="text-xs text-slate-400 italic pr-2">
                              System Protected
                            </span>
                          ) : (
                            <>
                              {/* Suspend or Reactivate Button */}
                              <button
                                onClick={() => handleOpenSuspendModal(u)}
                                title={isSuspended ? "Reactivate user account" : "Suspend user account"}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                  isSuspended
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                }`}
                              >
                                {isSuspended ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleOpenDeleteModal(u)}
                                title="Delete or deactivate user"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 text-sm">
            <span className="text-slate-500 text-xs">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} registered users)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => fetchUsers(page - 1)}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages || loading}
                onClick={() => fetchUsers(page + 1)}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUSPEND / REACTIVATE CONFIRMATION MODAL */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    suspendModalUser.status === "ACTIVE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {suspendModalUser.status === "ACTIVE" ? (
                    <Ban className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {suspendModalUser.status === "ACTIVE"
                      ? "Suspend User Account"
                      : "Reactivate User Account"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administrative status change recorded in audit log
                  </p>
                </div>
              </div>
              <button
                disabled={isSuspending}
                onClick={() => setSuspendModalUser(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* User details summary card */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-semibold text-slate-800">
                    {suspendModalUser.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{suspendModalUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-medium text-slate-800">{suspendModalUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-semibold">{suspendModalUser.status}</span>
                </div>
              </div>

              {/* Consequence explanation */}
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed ${
                  suspendModalUser.status === "ACTIVE"
                    ? "bg-amber-50 text-amber-900 border border-amber-200"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                }`}
              >
                {suspendModalUser.status === "ACTIVE" ? (
                  <p>
                    <strong>Consequences:</strong> Suspending this account will immediately revoke
                    all active refresh sessions, invalidate JWT authorization tokens, and prevent
                    the user from logging in or accessing course contents.
                  </p>
                ) : (
                  <p>
                    <strong>Consequences:</strong> Reactivating this account will restore standard
                    login access and permit the user to resume learning and managing courses.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSuspending}
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSuspending}
                onClick={handleConfirmStatusToggle}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                  suspendModalUser.status === "ACTIVE"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isSuspending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSuspending
                    ? "Processing..."
                    : suspendModalUser.status === "ACTIVE"
                    ? "Confirm Suspension"
                    : "Confirm Reactivation"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESTRUCTIVE DELETE CONFIRMATION MODAL WITH LIVE SUMMARY */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-rose-950">
                    Delete User Account
                  </h3>
                  <p className="text-xs text-rose-700">
                    Destructive administrative operation & audit verification
                  </p>
                </div>
              </div>
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModalUser(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Target info card */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target User:</span>
                  <span className="font-semibold text-slate-800">{deleteModalUser.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-mono text-slate-800">{deleteModalUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">User Role:</span>
                  <span className="font-medium text-slate-800">{deleteModalUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account ID:</span>
                  <span className="font-mono text-[11px] text-slate-600">{deleteModalUser.id}</span>
                </div>
              </div>

              {/* Relational Impact Statistics */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Associated System Records
                </span>

                {loadingSummary ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Analyzing user relationship graph across database...</span>
                  </div>
                ) : userSummary ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <BookOpen className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900">
                        {userSummary.stats.coursesCount}
                      </div>
                      <div className="text-[10px] text-slate-500">Courses</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <GraduationCap className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900">
                        {userSummary.stats.enrollmentsCount}
                      </div>
                      <div className="text-[10px] text-slate-500">Enrollments</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <CreditCard className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900">
                        {userSummary.stats.paymentsCount}
                      </div>
                      <div className="text-[10px] text-slate-500">Payments</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900">
                        {userSummary.stats.certificatesCount}
                      </div>
                      <div className="text-[10px] text-slate-500">Certificates</div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Deletion Strategy Notice */}
              {userSummary && (
                <div className="p-3.5 rounded-lg text-xs leading-relaxed border bg-amber-50 border-amber-200 text-amber-900">
                  {userSummary.stats.coursesCount > 0 ||
                  userSummary.stats.enrollmentsCount > 0 ||
                  userSummary.stats.paymentsCount > 0 ||
                  userSummary.stats.certificatesCount > 0 ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Safe Deactivation & Retention Policy Applied:</strong>
                        <p className="mt-1 text-slate-700">
                          Because this user has linked courses, enrollments, payments, or certificates,
                          their account will be <em>safely deactivated</em> (`INACTIVE`), authentication
                          tokens permanently revoked, and password scrambled. Historical financial and
                          academic records remain intact to protect database integrity.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Permanent Database Deletion:</strong>
                        <p className="mt-1 text-slate-700">
                          This account has no linked course or financial records. It will be permanently
                          purged from the database. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Explicit confirmation checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/80 cursor-pointer select-none hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-slate-800 leading-normal">
                  I understand the consequences and confirm the administrative removal of{" "}
                  <strong className="font-mono text-slate-900">{deleteModalUser.email}</strong>.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteConfirmed}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Permanently Execute Deletion"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
