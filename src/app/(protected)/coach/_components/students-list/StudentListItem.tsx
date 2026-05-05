"use client";

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
          ? "bg-[#2B4257]/5 border-l-[#2B4257]"
          : "border-l-transparent hover:bg-gray-50 hover:border-l-[#2B4257]/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 select-none ${
            isActive
              ? "bg-[#2B4257] text-white"
              : "bg-[#2B4257]/10 text-[#2B4257]"
          }`}
        >
          {initial}
        </div>
        <span
          className={`text-sm font-medium truncate ${
            isActive ? "text-[#2B4257]" : "text-gray-800"
          }`}
        >
          {studentFullName}
        </span>
      </div>

      <div
        className="mt-2.5 flex flex-wrap gap-1.5 pl-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onMessage(student)}
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-[#2B4257] hover:bg-[#2B4257]/80 transition-colors"
        >
          Message
        </button>
        <button
          onClick={() => onLessonSpace(student.id)}
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          Lesson Space
        </button>
        <button
          onClick={() => onAssignCourse(student)}
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-[#2B4257] border border-[#2B4257]/25 hover:bg-[#2B4257]/5 transition-colors"
        >
          Assign Course
        </button>
      </div>
    </li>
  );
}
