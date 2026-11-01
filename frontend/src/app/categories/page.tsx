"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { apiFetch } from "@/lib/api";
import { Category } from "@/types";
import { Folder, ArrowRight, Loader2 } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Category[]>("/categories")
      .then((data) => {
        if (active) {
          setCategories(data || []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to load academic categories.");
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
    <>
      <Header />
      <main className="min-h-screen bg-surface pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-surface-variant/40 pb-6">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Academic Registry
            </span>
            <h1 className="font-display-lg text-display-lg text-primary tracking-tight mt-1">
              Curriculum Disciplines &amp; Categories
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-2xl mt-2">
              Explore accredited fields of study, departmental specializations, and interdisciplinary academic faculties across the university catalogue.
            </p>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-outline">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="font-body-sm text-sm">Loading academic disciplines...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl bg-error-container/20 border border-error/20 text-error text-center">
              <p className="font-semibold">{error}</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 text-outline">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-on-surface">No disciplines currently available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/courses?categorySlug=${encodeURIComponent(cat.slug)}`}
                  className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant hover:border-primary transition-all duration-200 group flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center font-bold">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="font-code-sm text-code-sm text-outline mt-0.5">
                        slug: {cat.slug}
                      </p>
                    </div>
                    {cat.description && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-surface-variant/40 flex items-center justify-between text-sm font-label-md text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Browse Courses</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
