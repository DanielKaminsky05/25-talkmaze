"use client";

import { useState } from "react";
import MyStudents from "./components/MyStudents";
import StudentDetails from "./components/StudentDetails";

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
    <div className="h-full w-full bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">
        Coach Dashboard
      </h1>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-8 h-[calc(100vh-180px)] min-h-[500px]">
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
    </div>
  );
}
