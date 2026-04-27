"use client";

import { useState } from "react";
import MyStudents from "./components/MyStudents";
import StudentDetails from "./components/StudentDetails";
import LessonsTable from "./components/LessonsTable";

import type { Database } from "@/utils/supabase/types/database";

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
  const [openChatForStudent, setOpenChatForStudent] = useState<Student | null>(null);

  const handleMessageClick = (student: Student | null) => {
    if (!student) return;

    setActiveStudent(student);
    setOpenChatForStudent(student);
  };

  return (
    <div className="w-full p-8 mx-auto">
      <div className="flex flex-col gap-8 w-full">
        <div className="rounded-2xl bg-[#2B4257]/10 border border-[#2B4257]/15 px-6 py-5">
          <h1 className="text-3xl font-bold text-[#2B4257]">Coach Dashboard</h1>
          <p className="mt-2 text-sm text-[#2B4257]/70">
            Manage students, review lesson progress, and open conversations.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8 w-full min-h-[560px]">
          <div className="rounded-2xl bg-white/80 border border-[#2B4257]/10 shadow-sm overflow-hidden">
            <MyStudents
              activeStudentId={activeStudent?.id}
              onStudentClick={setActiveStudent}
              onMessageClick={handleMessageClick}
              coachId={currentUserId}
            />
          </div>

          <div className="rounded-2xl bg-white/80 border border-[#2B4257]/10 shadow-sm overflow-hidden min-h-[560px]">
            <StudentDetails
              student={activeStudent}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              autoOpenChat={openChatForStudent?.id}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 border border-[#2B4257]/10 shadow-sm overflow-hidden">
          <LessonsTable
            studentId={activeStudent?.id}
            studentName={`${activeStudent?.first_name || ""} ${activeStudent?.last_name || ""}`.trim()}
          />
        </div>
      </div>
    </div>
  );
}