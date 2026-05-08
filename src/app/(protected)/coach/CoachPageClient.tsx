"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import MyStudents from "./_components/MyStudents";
import StudentDetails from "./_components/StudentDetails";
import LessonsTable from "./_components/LessonsTable";

import type { Database } from "@/src/services/supabase/types/database";
import { fullName } from "@/src/utils/formatName";

type Student = Database["public"]["Tables"]["students"]["Row"];

interface CoachPageClientProps {
  currentUserId: string;
  currentUserEmail: string;
  selectedStudent: Student | null;
  assignedStudents: Student[];
  selectedStudentId: string | null;
  selectionNotice: string | null;
  initialOpenChatTarget: "student" | "parent" | null;
}

export default function CoachPageClient({
  currentUserId,
  currentUserEmail,
  selectedStudent,
  assignedStudents,
  selectedStudentId,
  selectionNotice,
  initialOpenChatTarget,
}: CoachPageClientProps) {
  const router = useRouter();
  const [manualChatOpenKey, setManualChatOpenKey] = useState(0);
  const [manualChatOpenTarget, setManualChatOpenTarget] = useState<
    "student" | "parent" | null
  >(null);

  const autoOpenChatTarget = initialOpenChatTarget ?? manualChatOpenTarget;
  const autoOpenChatKey = initialOpenChatTarget
    ? `route:${selectedStudentId ?? "none"}:${initialOpenChatTarget}`
    : `manual:${manualChatOpenKey}`;

  const handleStudentClick = (student: Student | null) => {
    if (!student) return;
    if (student.id === selectedStudentId) return;
    router.push(`/coach/students/${student.id}`);
  };

  const handleMessageClick = (student: Student | null) => {
    if (!student) return;

    if (student.id !== selectedStudentId) {
      router.push(`/coach/students/${student.id}?openChat=student`);
      return;
    }

    setManualChatOpenTarget("student");
    setManualChatOpenKey((prev) => prev + 1);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Coach Dashboard
          </h1>
          <Link
            href="/coach/calendar"
            className="self-start sm:self-auto inline-flex items-center gap-2 text-sm font-medium text-white border border-white/25 rounded-lg px-4 py-2 hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            <CalendarDays size={16} />
            Calendar
          </Link>
        </header>

        {selectionNotice === "student-unavailable" && (
          <p className="text-sm text-[#1F2E3B] bg-[#B1E7D6] border border-[#B1E7D6]/70 rounded-lg px-4 py-2.5">
            That student is unavailable for your account. Showing your first assigned student instead.
          </p>
        )}

        {/* Students + Details grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <MyStudents
            students={assignedStudents}
            activeStudentId={selectedStudent?.id ?? null}
            onStudentClick={handleStudentClick}
            onMessageClick={handleMessageClick}
            coachId={currentUserId}
          />
          <StudentDetails
            student={selectedStudent}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            autoOpenChatTarget={autoOpenChatTarget}
            autoOpenChatKey={autoOpenChatKey}
          />
        </div>

        {/* Lessons table */}
        <LessonsTable
          studentId={selectedStudent?.id}
          studentName={fullName(
            selectedStudent?.first_name,
            selectedStudent?.last_name,
          )}
        />
      </div>
    </div>
  );
}
