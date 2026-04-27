"use client";

import { useState } from "react";
import Link from "next/link";
import FeedbackEditor from "@/app/(protected)/components/ui/text-editor/FeedbackEditor";

const STATUS_LABELS: Record<number, string> = {
  1: "Not Started",
  2: "In Progress",
  3: "Completed",
};

const STATUS_STYLES: Record<number, string> = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-green-100 text-green-700",
};

export interface LessonInfo {
  title: string;
  description: string | null;
  courseName: string | null;
  preLessonUrl: string | null;
  postLessonUrl: string | null;
  slideshowUrl: string | null;
}

export interface LessonDetailClientProps {
  studentId: string;
  lessonId: string;
  studentName: string;
  lesson: LessonInfo;
  initialStatus: number;
  initialPositiveFeedback: string;
  initialImprovementFeedback: string;
}

/**
 * LessonDetailClient - interactive coach view for a single student lesson.
 *
 * Status changes are saved immediately on selection;
 * Feedback requires an explicit "Save" action.
 */
export default function LessonDetailClient({
  studentId,
  lessonId,
  studentName,
  lesson,
  initialStatus,
  initialPositiveFeedback,
  initialImprovementFeedback,
}: LessonDetailClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [positiveFeedback, setPositiveFeedback] = useState(
    initialPositiveFeedback,
  );
  const [improvementFeedback, setImprovementFeedback] = useState(
    initialImprovementFeedback,
  );
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Persists a status change immediately when coach changes the dropdown. */
  const handleStatusChange = async (newStatus: number) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/lesson-progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          lesson_id: lessonId,
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setStatus(newStatus);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  /** Saves both feedback fields together. Shows a "Saved!" confirmation */
  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    setFeedbackSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/coach/lesson-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          lesson_id: lessonId,
          positive_feedback: positiveFeedback,
          improvement_feedback: improvementFeedback,
        }),
      });
      if (!res.ok) throw new Error("Failed to save feedback");
      setFeedbackSaved(true);
      setTimeout(() => setFeedbackSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className="w-full p-8 mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/coach"
            className="inline-flex items-center gap-1.5 text-sm text-[#2B4257]/70 hover:text-[#2B4257] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 5-7 7 7 7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-2xl bg-[#2B4257]/10 border border-[#2B4257]/15 px-6 py-5">
          <p className="text-sm font-medium text-[#2B4257]/60 mb-1">
            {studentName}
          </p>
          <h1 className="text-2xl font-bold text-[#2B4257]">{lesson.title}</h1>
          {lesson.courseName && (
            <p className="text-sm text-[#2B4257]/60 mt-1">
              Course: {lesson.courseName}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Lesson Details
          </h2>
          <div className="flex flex-col gap-4">
            {lesson.description && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {lesson.description}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ResourceLink
                label="Pre-Lesson Task"
                href={lesson.preLessonUrl}
              />
              <ResourceLink
                label="Post-Lesson Task"
                href={lesson.postLessonUrl}
              />
              <ResourceLink label="Slideshow" href={lesson.slideshowUrl} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Progress Status
          </h2>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
            <select
              disabled={updatingStatus}
              value={status}
              onChange={(e) => handleStatusChange(Number(e.target.value))}
              className="border border-gray-200 rounded-lg text-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#2B4257]/40 disabled:opacity-50"
            >
              <option value={1}>Not Started</option>
              <option value={2}>In Progress</option>
              <option value={3}>Completed</option>
            </select>
            {updatingStatus && (
              <div className="w-4 h-4 border-2 border-[#2B4257] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Coach Feedback
          </h2>
          <FeedbackEditor
            title="Positive Feedback"
            content={positiveFeedback}
            onChange={setPositiveFeedback}
          />
          <FeedbackEditor
            title="Areas of Improvement"
            content={improvementFeedback}
            onChange={setImprovementFeedback}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveFeedback}
              disabled={savingFeedback}
              className="px-5 py-2.5 rounded-lg bg-[#2B4257] text-white text-sm font-medium hover:bg-[#2B4257]/90 transition-colors disabled:opacity-50"
            >
              {savingFeedback ? "Saving…" : "Save Feedback"}
            </button>
            {feedbackSaved && (
              <span className="text-sm text-green-600 font-medium">Saved!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Link to a lesson resource (slideshow, tasks, etc.) */
function ResourceLink({ label, href }: { label: string; href: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline font-medium"
        >
          View
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ) : (
        <span className="text-sm text-gray-400 italic">None</span>
      )}
    </div>
  );
}
