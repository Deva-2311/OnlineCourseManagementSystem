"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Quiz, QuizAttempt } from "@/types";
import { getAuthToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

function QuizContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  // Load quiz details on mount
  useEffect(() => {
    if (!quizId) return;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/quizzes/${quizId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load quiz details");
        }

        const data: Quiz = await res.json();
        setQuiz(data);
      } catch (err: unknown) {
        const msg = (err as Error)?.message;
        setError(msg || "Failed to connect to the quiz service");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitAnswers = useCallback(async () => {
    if (!activeAttempt) return;

    try {
      setSubmitting(true);
      const token = getAuthToken();

      const payload = {
        answers: Object.entries(answersRef.current).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      };

      const res = await fetch(`${API_BASE}/quiz-attempts/${activeAttempt.id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit quiz attempt");
      }

      const gradedAttempt: QuizAttempt = await res.json();
      setResult(gradedAttempt);
      setActiveAttempt(null);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [activeAttempt]);

  const handleAutoSubmit = useCallback(async () => {
    if (!activeAttempt) return;
    setError("Time expired! Your answers are being automatically submitted.");
    await submitAnswers();
  }, [activeAttempt, submitAnswers]);

  const autoSubmitRef = useRef(handleAutoSubmit);
  useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  // Timer countdown hook for timed attempts
  useEffect(() => {
    if (!activeAttempt || timeLeftSeconds === null || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Automatically trigger submission when time expires
          autoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAttempt, timeLeftSeconds]);

  const handleStartAttempt = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();

      const res = await fetch(`${API_BASE}/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to start quiz attempt");
      }

      const attemptData: QuizAttempt = await res.json();
      setActiveAttempt(attemptData);
      setAnswers({});
      setCurrentQuestionIndex(0);

      if (quiz?.timeLimitMinutes) {
        setTimeLeftSeconds(quiz.timeLimitMinutes * 60);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Unable to start quiz attempt");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeAttempt) return;

    if (!window.confirm("Are you sure you want to submit your answers for grading?")) {
      return;
    }

    await submitAnswers();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 font-medium">Loading assessment...</span>
      </div>
    );
  }

  if (error && !activeAttempt && !result) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl mt-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 text-lg">Unable to Load Quiz</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. RESULT SCREEN
  if (result) {
    return (
      <div className="max-w-3xl mx-auto mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="text-center">
          {result.isPassed ? (
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-800">
            {result.isPassed ? "Assessment Passed!" : "Assessment Not Passed"}
          </h2>
          <p className="text-slate-500 mt-1">
            {result.isPassed
              ? "Congratulations, you successfully passed the assessment threshold."
              : "You did not achieve the required passing score for this assessment."}
          </p>

          <div className="grid grid-cols-3 gap-4 my-8 max-w-lg mx-auto">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {result.score} / {result.maxScore}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{result.percentage}%</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  result.isPassed ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {result.isPassed ? "PASS" : "FAIL"}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setResult(null);
                handleStartAttempt();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Return to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE ATTEMPT SCREEN
  if (activeAttempt && quiz?.questions && quiz.questions.length > 0) {
    const questions = quiz.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="max-w-4xl mx-auto mt-4">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm mb-6">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{quiz.title}</h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Attempt #{activeAttempt.attemptNumber} • Question {currentQuestionIndex + 1} of{" "}
              {questions.length}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {timeLeftSeconds !== null && (
              <div
                className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg border ${
                  timeLeftSeconds < 120
                    ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            )}

            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Grading..." : "Submit Quiz"}
            </button>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              Question {currentQuestionIndex + 1}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {currentQuestion.points} point{currentQuestion.points > 1 ? "s" : ""}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mt-4 leading-relaxed">
            {currentQuestion.questionText}
          </h3>

          {/* Options */}
          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.id;
              return (
                <label
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={isSelected}
                    onChange={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 mt-1"
                  />
                  <span className="text-slate-700 text-sm font-medium leading-relaxed">
                    {opt.optionText}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-xs text-slate-400">
              Answered {answeredCount} of {questions.length} questions
            </span>

            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Finish & Submit
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. QUIZ OVERVIEW & INSTRUCTIONS SCREEN
  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
      <div className="flex items-center gap-3 text-blue-600 mb-2">
        <BookOpen className="w-6 h-6" />
        <span className="text-xs font-bold uppercase tracking-wider">Assessment Portal</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-800">{quiz?.title}</h1>
      {quiz?.instructions && (
        <p className="text-slate-600 mt-3 text-sm leading-relaxed">{quiz.instructions}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {quiz?.questionsCount ?? 0}
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Time Limit</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {quiz?.timeLimitMinutes ? `${quiz.timeLimitMinutes} mins` : "Untimed"}
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passing Score</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{quiz?.passingScore}%</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Attempts</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{quiz?.maxAttempts}</div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={handleStartAttempt}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Start Assessment <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function StudentQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600 font-medium">Loading assessment...</span>
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}

