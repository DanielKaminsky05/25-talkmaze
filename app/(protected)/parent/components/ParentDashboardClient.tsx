"use client";

import { useState } from "react";
import StudentProfileCard from "./StudentProfileCard";
import StudentPostLessonTaskSettings from "./StudentPostLessonTaskSettings";
import StudentAttendanceDetails from "./StudentAttendanceDetails";
import SelectedStudentSubscriptionStatus from "./SelectedStudentSubscriptionStatus";
import ScheduleList from "../../components/ScheduleList";
import { Appointment } from "../../types/lesson";

export interface Student {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  grade: string | number | null;
  avatar_url: string | null;
  location: string | null;
  date_of_birth: string | null;
  bio: string | null;
  remaining_lessons: number;
  total_lessons: number;
  status: string;
}

interface Props {
  students: Student[];
  schedule: Appointment[];
}

/**
 * Parent Dashboard client component. 
 * 
 * Passes data down to the sub-components (attendance, schedule, etc).
 * Renders all the sub components of the page in the correct layout.
 */
export default function ParentDashboardClient({ students, schedule }: Props) {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const onNextStudent = () => {
    if (students.length > 1) {
      setCurrentStudentIndex((prev) => (prev + 1) % students.length);
    }
  };

  const onPrevStudent = () => {
    if (students.length > 1) {
      setCurrentStudentIndex(
        (prev) => (prev - 1 + students.length) % students.length,
      );
    }
  };

  const currentStudent = students[currentStudentIndex] ?? ({} as Student);

  return (
    <div className="w-full h-full p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-[1fr_1.3fr] gap-6 h-full min-h-0">
        {/* Left column */}
        <div className="flex flex-col gap-[22px] h-full min-h-0">
          <div className="flex-3 min-h-0">
            <StudentProfileCard
              name={
                currentStudent.first_name ||
                currentStudent.name ||
                "Select Student"
              }
              location={currentStudent.location || "Location"}
              dob={currentStudent.date_of_birth || "Not set"}
              grade={currentStudent.grade || "N/A"}
              description={currentStudent.bio || ""}
              imageUrl={currentStudent.avatar_url || undefined}
              onNext={students.length > 1 ? onNextStudent : undefined}
              onPrev={students.length > 1 ? onPrevStudent : undefined}
              currentIndex={currentStudentIndex}
              totalStudents={students.length}
            />
          </div>

          <div className="flex-2 min-h-0">
            <StudentPostLessonTaskSettings studentId={currentStudent.id} />
          </div>

          <div className="flex-2 min-h-0">
            <StudentAttendanceDetails streak={8} studentId={currentStudent.id} />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 min-h-0">
          <SelectedStudentSubscriptionStatus
            sessionsLeft={currentStudent.remaining_lessons ?? 0}
            totalSessions={currentStudent.total_lessons ?? 0}
            studentId={currentStudent.id}
            subscriptionStatus={currentStudent.status}
          />

          <div className="flex-1 min-h-0">
            <ScheduleList schedule={schedule} />
          </div>
        </div>
      </div>
    </div>
  );
}
