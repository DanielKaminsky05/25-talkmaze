"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  activeTab: "details" | "lessons";
}

export default function CoachPageClient({
  currentUserId,
  currentUserEmail,
  selectedStudent,
  assignedStudents,
  selectedStudentId,
  selectionNotice,
  initialOpenChatTarget,
  activeTab,
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

  const tabBase =
    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors";
  const tabActive = "bg-white text-[#2B4257]";
  const tabInactive = "text-white/60 hover:text-white";

  return (
    <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
      {/* Left panel: students list */}
      <div className="xl:w-[360px] xl:flex-shrink-0 flex flex-col ">
        {selectionNotice === "student-unavailable" && (
          <p className="text-sm text-[#1F2E3B] bg-[#B1E7D6] px-4 py-2.5 mb-4">
            That student is unavailable for your account. Showing your first
            assigned student instead.
          </p>
        )}
        <MyStudents
          students={assignedStudents}
          activeStudentId={selectedStudent?.id ?? null}
          onStudentClick={handleStudentClick}
          onMessageClick={handleMessageClick}
          coachId={currentUserId}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4 p-4 xl:p-6">
        {/* Tab bar — only shown when a student is selected */}
        {selectedStudentId && (
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 self-start">
            <Link
              href={`/coach/students/${selectedStudentId}`}
              className={`${tabBase} ${activeTab === "details" ? tabActive : tabInactive}`}
            >
              Details
            </Link>
            <Link
              href={`/coach/students/${selectedStudentId}/lessons`}
              className={`${tabBase} ${activeTab === "lessons" ? tabActive : tabInactive}`}
            >
              Lessons
            </Link>
          </div>
        )}

        {activeTab === "details" && (
          <StudentDetails
            student={selectedStudent}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            autoOpenChatTarget={autoOpenChatTarget}
            autoOpenChatKey={autoOpenChatKey}
          />
        )}

        {activeTab === "lessons" && (
          <div className="flex-1 min-h-0">
            <LessonsTable
              studentId={selectedStudent?.id}
              studentName={fullName(
                selectedStudent?.first_name,
                selectedStudent?.last_name,
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
