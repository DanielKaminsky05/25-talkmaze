"use client";

import { BookOpen } from "lucide-react";
import { MessageCircleIcon } from "@/src/components/ui/icons/MessageCircleIcon";
import { LessonsIcon } from "@/src/components/ui/icons/LessonsIcon";
import type { Database } from "@/src/services/supabase/types/database";
import { fullName } from "@/src/utils/formatName";

type Student = Database["public"]["Tables"]["students"]["Row"];

interface StudentListItemProps {
  student: Student;
  isActive: boolean;
  onSelect: (student: Student) => void;
  onMessage: (student: Student) => void;
  onLessonSpace: (studentId: string) => void;
  onAssignCourse: (student: Student) => void;
}

export default function StudentListItem({
  student,
  isActive,
  onSelect,
  onMessage,
  onLessonSpace,
  onAssignCourse,
}: StudentListItemProps) {
  const studentFullName = fullName(
    student.first_name,
    student.last_name,
    "Unnamed Student",
  );
  const initial = (student.first_name || student.last_name || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <li
      onClick={() => onSelect(student)}
      className={`px-4 py-3 transition-all cursor-pointer border-l-2 ${
        isActive
          ? "bg-[#65CFAD]/10 border-l-[#65CFAD]"
          : "border-l-transparent hover:bg-gray-50 hover:border-l-[#2B4257]/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${
            isActive
              ? "bg-[#65CFAD] text-[#1F2E3B]"
              : "bg-[#2B4257]/10 text-[#2B4257]"
          }`}
        >
          {initial}
        </div>
        <span
          className={`text-sm font-medium truncate ${
            isActive ? "text-[#1F2E3B]" : "text-gray-800"
          }`}
        >
          {studentFullName}
        </span>
        <div
          className="ml-auto flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onMessage(student)}
            title="Message"
            className="p-1.5 rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 transition-colors"
          >
            <MessageCircleIcon size={16} />
          </button>
          <button
            onClick={() => onLessonSpace(student.id)}
            title="Start Lesson"
            className="p-1.5 rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 transition-colors"
          >
            <LessonsIcon size={16} />
          </button>
          <button
            onClick={() => onAssignCourse(student)}
            title="Assign Course"
            className="p-1.5 rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 transition-colors"
          >
            <BookOpen size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
