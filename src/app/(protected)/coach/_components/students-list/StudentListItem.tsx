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
  isLaunchingLessonSpace?: boolean;
}

export default function StudentListItem({
  student,
  isActive,
  onSelect,
  onMessage,
  onLessonSpace,
  onAssignCourse,
  isLaunchingLessonSpace = false,
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
      className={`px-4 py-3 transition-all cursor-pointer border-l-2 ${
        isActive
          ? "bg-[#65CFAD]/10 border-l-[#65CFAD]"
          : "border-l-transparent hover:bg-gray-50 hover:border-l-[#2B4257]/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSelect(student)}
          aria-label={`Open details for ${studentFullName}`}
          aria-current={isActive ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4257]/35"
        >
          <span
            className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${
              isActive
                ? "bg-[#65CFAD] text-[#1F2E3B]"
                : "bg-[#2B4257]/10 text-[#2B4257]"
            }`}
            aria-hidden
          >
            {initial}
          </span>
          <span
            className={`text-sm font-medium truncate ${
              isActive ? "text-[#1F2E3B]" : "text-gray-800"
            }`}
          >
            {studentFullName}
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onMessage(student)}
            aria-label={`Message ${studentFullName}`}
            title={`Message ${studentFullName}`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4257]/35 transition-colors"
          >
            <MessageCircleIcon size={16} />
          </button>
          <button
            disabled={isLaunchingLessonSpace}
            onClick={() => onLessonSpace(student.id)}
            aria-label={`Start lesson with ${studentFullName}`}
            title={`Start lesson with ${studentFullName}`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4257]/35 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LessonsIcon size={16} />
          </button>
          <button
            onClick={() => onAssignCourse(student)}
            aria-label={`Assign course to ${studentFullName}`}
            title={`Assign course to ${studentFullName}`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B4257]/35 transition-colors"
          >
            <BookOpen size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
