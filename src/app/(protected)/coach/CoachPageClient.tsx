"use client";

import { useState } from "react";
import Link from "next/link";
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
          studentName={fullName(
            activeStudent?.first_name,
            activeStudent?.last_name,
          )}
        />
      </div>
    </div>
  );
}
