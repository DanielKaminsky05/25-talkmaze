"use client";

import { useState } from "react";
import MyStudents from "./components/MyStudents";
import StudentDetails from "./components/StudentDetails";
import LessonsTable from "./components/LessonsTable";

interface Student {
  id: string;
  name: string;
  tw_id: string | null;
}

export default function CoachPage() {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const handleStudentClick = (student: Student) => {
    setActiveStudent(student);
  };

  return (
    <div className="h-full w-full bg-white rounded-2xl p-8 shadow-sm overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">
        Coach Dashboard
      </h1>

      {/* Top Grid: Students sidebar + Details panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-8 mb-8 min-h-[500px]">
        {/* Left Column: My Students (Sidebar) */}
        <div className="h-full md:col-span-1 lg:col-span-1">
          <MyStudents
            activeStudentId={activeStudent?.id}
            onStudentClick={handleStudentClick}
          />
        </div>

        {/* Right Column: Student Details */}
        <div className="h-full md:col-span-3 lg:col-span-3">
          <StudentDetails student={activeStudent} />
        </div>
      </div>

      {/* Full-width: Lessons Table */}
      <LessonsTable studentId={activeStudent?.id} studentName={activeStudent?.name} />
    </div>
  );
}
