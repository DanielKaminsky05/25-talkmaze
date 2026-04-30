"use client";

import { useState } from "react";
import Link from "next/link";
import LessonCard from "@/app/(protected)/lessons/_components/LessonCard";
import ProgressCard from "@/app/(protected)/lessons/_components/ProgressCard";
import FeedbackDisplay from "@/app/(protected)/components/ui/text-editor/FeedbackDisplay";

export interface LessonProp {
  id: string;
  title: string;
  lessonNumber: number;
  tokenTitle: string | null;
  tokenIcon: string | null;
  isCompleted: boolean;
  isLocked: boolean;
  status: number;
  positiveFeedback: string | null;
  improvementFeedback: string | null;
}

interface Props {
  studentName: string;
  courseName: string | null;
  lessons: LessonProp[];
  progress: { completed: number; total: number };
}

export default function ParentStudentLessonsClient({
  studentName,
  courseName,
  lessons,
  progress,
}: Props) {
  const [selectedLesson, setSelectedLesson] = useState<LessonProp | null>(null);

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 md:p-12 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/parent/lessons"
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All Students
        </Link>
        <span className="text-white/30">/</span>
        <h1 className="text-white text-xl font-bold">
          {studentName}&apos;s Lessons
          {courseName && (
            <span className="ml-2 text-sm font-normal text-white/50">
              {courseName}
            </span>
          )}
        </h1>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-[#2B4257]/40 backdrop-blur-md rounded-3xl p-12 flex flex-col items-center text-center gap-4 border border-[#B1E7D6]/20">
          <h2 className="text-2xl font-bold text-white">No Course Assigned</h2>
          <p className="text-[#B1E7D6] opacity-80 max-w-md">
            {studentName} hasn&apos;t been assigned to a course yet.
          </p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <ProgressCard
            completed={progress.completed}
            total={progress.total}
            width="w-full"
          />

          {/* Lesson grid */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] pb-12">
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lessonNumber={lesson.lessonNumber}
                title={lesson.title}
                tokenTitle={lesson.tokenTitle}
                icon={lesson.tokenIcon}
                isCompleted={lesson.isCompleted}
                isLocked={lesson.isLocked}
                onClick={() => setSelectedLesson(lesson)}
              />
            ))}
          </div>
        </>
      )}

      {/* Feedback modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedLesson(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
              style={{ backgroundColor: "#2B4257" }}
            >
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide font-medium">
                  Lesson {selectedLesson.lessonNumber}
                </p>
                <h3 className="text-white font-bold text-lg leading-tight">
                  {selectedLesson.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLesson(null)}
                className="text-white/60 hover:text-white transition-colors ml-4 shrink-0"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 flex flex-col gap-4">
              {selectedLesson.status === 3 ? (
                <>
                  <FeedbackDisplay
                    title="Highlights"
                    content={selectedLesson.positiveFeedback}
                  />
                  <FeedbackDisplay
                    title="Areas to Improve"
                    content={selectedLesson.improvementFeedback}
                  />
                  {!selectedLesson.positiveFeedback &&
                    !selectedLesson.improvementFeedback && (
                      <p className="text-gray-400 text-sm text-center py-4">
                        No feedback has been written for this lesson yet.
                      </p>
                    )}
                </>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">
                  This lesson hasn&apos;t been completed yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
