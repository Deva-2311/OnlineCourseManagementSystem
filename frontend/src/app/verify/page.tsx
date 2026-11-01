"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ShieldCheck, Search, ArrowRight, CheckCircle2 } from "lucide-react";

export default function VerifySearchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/verify/${encodeURIComponent(code.trim())}`);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface text-on-surface flex flex-col justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold text-2xl sm:text-3xl">
              Verify Official Credential
            </h1>
            <p className="font-body-md text-on-surface-variant text-sm">
              Enter an official OCMS certificate number to verify recipient, conferral date, and curriculum completion validity.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/50 shadow-md">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative text-left">
                <label htmlFor="cert-code-input" className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Certificate Serial Identifier
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="cert-code-input"
                    type="text"
                    placeholder="e.g. OCMS-CERT-XXXXX-YYYY"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-outline-variant/60 text-on-surface placeholder:text-outline font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold text-sm cursor-pointer"
              >
                <span>Verify Credential Authenticity</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Authoritative public ledger maintained by OCMS Registrar. No login required.</span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
