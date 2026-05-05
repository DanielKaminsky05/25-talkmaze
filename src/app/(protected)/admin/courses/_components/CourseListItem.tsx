"use client";

import Avatar from "../../_components/Avatar";
import type { Course } from "@/src/lib/lessons/types";

export default function CourseListItem({
  course,
  isSelected,
  onClick,
}: {
  course: Course;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected ? "bg-blue-300/10 border-l-blue-300" : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar letter={course.name.charAt(0) || "C"} color="text-blue-300" bg="bg-blue-400/15" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}>
          {course.name}
        </p>
        <p className="text-white/35 text-xs truncate">ID: {course.id}</p>
      </div>
    </button>
  );
}
