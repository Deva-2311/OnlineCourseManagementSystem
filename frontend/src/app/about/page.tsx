import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Compass, Award, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
              University Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
              About the Online Course Management System
            </h1>
            <p className="text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Empowering global scholars, faculty, and educational administrators with verified, prerequisite-aware course delivery and cryptographic credential issuance.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-sm space-y-8">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span>Our Academic Mission</span>
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The Online Course Management System (OCMS) bridges rigorous university-grade education with modern distributed learning technologies. We ensure learners acquire authentic, evaluated domain mastery backed by structured prerequisites, continuous learning insights, and empirical skill evaluations.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-surface-variant/40">
              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-on-surface">Prerequisite Enforcement</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Automatic dependency graphs prevent knowledge gaps by ensuring foundational course mastery before advanced enrollment.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-on-surface">Adaptive Learning Pathways</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Diagnostic quiz evaluations generate dynamic remedial lessons and targeted practice sessions tailored to individual skill profiles.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-on-surface">Verifiable Credentials</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Every conferred credential includes a unique verification identifier accessible through our public registry ledger.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-on-surface">Comprehensive Faculty Tooling</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Dedicated course studios allow instructors to design modular syllabi, upload media lectures, manage cohort rosters, and track completion.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-surface-variant/40 flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-semibold text-xs transition-colors"
              >
                <span>Browse Academic Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify an Existing Credential</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
