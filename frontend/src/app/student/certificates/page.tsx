"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Certificate } from "@/types";
import { getAuthToken } from "@/lib/api";

function StudentCertificatesContent() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token) {
      setTimeout(() => {
        if (active) setLoading(false);
      }, 0);
      return;
    }

    fetch(`${API_BASE}/certificates/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load your educational certificates");
        }
        return res.json();
      })
      .then((data: Certificate[]) => {
        if (active) {
          setCertificates(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = (err as Error)?.message;
          setError(msg || "Failed to load certificates");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [API_BASE]);

  const handleDownload = async (certId: string, certNumber: string) => {
    try {
      setDownloadingId(certId);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/certificates/${certId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Could not download PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      alert(msg || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-12" />
        <p className="text-center font-body-sm text-outline animate-pulse">
          Loading earned credentials...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">
            Academic Credentials &amp; Degrees
          </span>
          <h1 className="font-headline-md text-headline-md text-on-surface font-semibold mt-0.5">
            Earned Certificates
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Official verifiable completion certificates issued upon 100% curriculum and assessment completion.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-error flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-label-md">{error}</span>
        </div>
      )}

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-4">
          <Award className="w-12 h-12 text-outline mx-auto" />
          <h2 className="font-title-lg text-title-lg text-on-surface font-medium">
            No Certificates Conferred Yet
          </h2>
          <p className="font-body-sm text-on-surface-variant max-w-md mx-auto">
            Certificates are automatically awarded when you complete 100% of the lessons and pass all required assessments for an enrolled course.
          </p>
          <div className="pt-2">
            <Link
              href="/student"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors"
            >
              <span>View Enrolled Courses</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const isDownloading = downloadingId === cert.id;
            const isRevoked = cert.status === "REVOKED";

            return (
              <div
                key={cert.id}
                className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        !isRevoked
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold line-clamp-2">
                      {cert.courseTitle}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-outline" />
                      Issued: {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-low font-code-sm text-xs text-outline flex items-center justify-between">
                    <span className="truncate">ID: {cert.certificateNumber}</span>
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-container-low flex items-center justify-between gap-3">
                  <button
                    disabled={isDownloading || isRevoked}
                    onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
                  </button>

                  <Link
                    href={`/verify/${cert.certificateNumber}`}
                    className="flex items-center gap-1 font-label-sm text-primary hover:underline"
                  >
                    <span>Verify</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentCertificatesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <StudentCertificatesContent />
    </Suspense>
  );
}
