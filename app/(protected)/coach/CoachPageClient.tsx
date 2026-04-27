"use client";

import { useState } from "react";
import Link from "next/link";
import MyStudents from "./components/MyStudents";
import StudentDetails from "./components/StudentDetails";
import LessonsTable from "./components/LessonsTable";

import type { Database } from "@/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

interface CoachPageClientProps {
  currentUserId: string;
  currentUserEmail: string;
}

export default function CoachPageClient({
  currentUserId,
  currentUserEmail,
}: CoachPageClientProps) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [openChatForStudent, setOpenChatForStudent] = useState<Student | null>(
    null,
  );

  const handleMessageClick = (student: Student | null) => {
    if (!student) return;
    setActiveStudent(student);
    setOpenChatForStudent(student);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <header className="rounded-2xl bg-[#2B4257]/10 border border-[#2B4257]/15 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2B4257]">
              Coach Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#2B4257]/70">
              Manage students, review lesson progress, and open conversations.
            </p>
          </div>
          <Link
            href="/coach/calendar"
            className="self-start sm:self-auto text-sm font-medium text-[#2B4257] border border-[#2B4257]/30 rounded-lg px-4 py-2 hover:bg-[#2B4257]/10 transition-colors whitespace-nowrap"
          >
            View Calendar →
          </Link>
        </header>

        {/* Students + Details grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <MyStudents
            activeStudentId={activeStudent?.id}
            onStudentClick={setActiveStudent}
            onMessageClick={handleMessageClick}
            coachId={currentUserId}
          />
          <StudentDetails
            student={activeStudent}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            autoOpenChat={openChatForStudent?.id}
          />
        </div>

        {/* Lessons table */}
        <LessonsTable
          studentId={activeStudent?.id}
          studentName={`${activeStudent?.first_name || ""} ${activeStudent?.last_name || ""}`.trim()}
        />
      </div>
    </div>
  );
}
