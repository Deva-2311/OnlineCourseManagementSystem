"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Search,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { PublicCertificateVerification } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

function VerifyContent() {
  const params = useParams();
  const router = useRouter();
  const certificateNumber = params?.certificateNumber as string;

  const [verification, setVerification] = useState<PublicCertificateVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!certificateNumber) return;

    const verify = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/certificates/verify/${encodeURIComponent(certificateNumber)}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Certificate not found in the public ledger. Please verify the identifier.");
          }
          throw new Error("Unable to complete verification check at this time.");
        }

        const data: PublicCertificateVerification = await res.json();
        setVerification(data);
      } catch (err: unknown) {
        const msg = (err as Error)?.message;
        setError(msg || "Verification request failed");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [certificateNumber]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      router.push(`/verify/${encodeURIComponent(manualCode.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-sm font-semibold mb-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Official Educational Credential Ledger
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Public Certificate Verification
          </h1>
          <p className="font-body-md text-on-surface-variant max-w-lg mx-auto">
            Verify the authenticity, conferral date, and valid accreditation status of certificates issued by the Online Course Management System.
          </p>
        </div>

        {/* Verification Search Bar */}
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. OCMS-CERT-XXXXX-YYYY"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-outline font-code-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Verify</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-body-sm text-outline animate-pulse">
              Consulting authoritative credential repository...
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-error/30 shadow-sm space-y-4">
            <ShieldAlert className="w-12 h-12 text-error mx-auto" />
            <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">
              Verification Unsuccessful
            </h2>
            <p className="font-body-sm text-on-surface-variant max-w-md mx-auto">
              {error}
            </p>
            <div className="pt-2">
              <span className="font-code-sm text-xs bg-surface-container px-3 py-1 rounded text-outline">
                Queried ID: {certificateNumber}
              </span>
            </div>
          </div>
        )}

        {/* Verified Result Card */}
        {!loading && verification && (
          <div
            className={`p-6 sm:p-8 rounded-2xl border shadow-sm space-y-6 ${
              verification.isValid
                ? "bg-surface-container-lowest border-primary/30"
                : "bg-surface-container-lowest border-error/40"
            }`}
          >
            {/* Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-container-low">
              <div className="flex items-center gap-3">
                {verification.isValid ? (
                  <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <span
                    className={`font-label-sm font-semibold uppercase px-2.5 py-0.5 rounded text-xs ${
                      verification.isValid
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {verification.isValid ? "Authentic & Valid" : "Revoked / Invalid"}
                  </span>
                  <div className="font-code-sm text-xs text-outline mt-1 font-semibold">
                    {verification.certificateNumber}
                  </div>
                </div>
              </div>

              {verification.isValid && (
                <div className="text-right">
                  <span className="text-[11px] text-outline uppercase block">Ledger Status</span>
                  <span className="font-label-sm font-medium text-primary">Cryptographically Recorded</span>
                </div>
              )}
            </div>

            {/* Credential Details */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="font-label-sm text-outline uppercase text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Recipient Name
                </span>
                <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {verification.recipientName}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-label-sm text-outline uppercase text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Program / Course Title
                </span>
                <p className="font-title-lg text-title-lg text-on-surface font-medium">
                  {verification.courseTitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-surface-container-low space-y-1">
                  <span className="font-label-sm text-outline text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date Conferred
                  </span>
                  <p className="font-label-md text-on-surface font-semibold">
                    {new Date(verification.issuedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low space-y-1">
                  <span className="font-label-sm text-outline text-[11px]">Issuing Platform</span>
                  <p className="font-label-md text-on-surface font-semibold">
                    Online Course Management System
                  </p>
                </div>
              </div>

              {/* Revocation Warning if Revoked */}
              {!verification.isValid && verification.revokedAt && (
                <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 text-error space-y-1">
                  <div className="font-label-md font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Revocation Details
                  </div>
                  <p className="font-body-sm text-xs">
                    Revoked on: {new Date(verification.revokedAt).toLocaleString()}
                  </p>
                  {verification.revocationReason && (
                    <p className="font-body-sm text-xs italic">
                      Reason: {verification.revocationReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="pt-4 border-t border-surface-container-low flex justify-between items-center text-xs text-outline">
              <span>Public Verification Record</span>
              <Link href="/courses" className="text-primary hover:underline flex items-center gap-1">
                Explore Accredited Courses <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicVerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
