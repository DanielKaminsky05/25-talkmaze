"use client";

import React, { useEffect, useState } from "react";
import StudentProfileCard from "./components/StudentProfileCard";
import PostLessonTasks from "./components/PostLessonTasks";
import AttendanceStreak from "./components/AttendanceStreak";
import PaymentStatus from "./components/PaymentStatus";
import ScheduleList from "../components/ScheduleList";
import { Appointment } from "../types/lesson";

export default function ParentDashboard() {
  const [schedule, setSchedule] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const response = await fetch("/api/teachworks/family-lessons");
        if (!response.ok) {
          throw new Error("Failed to fetch schedule");
        }
        const data = await response.json();
        
        // Map TeachworksLesson to Appointment interface
        const mappedSchedule: Appointment[] = data.map((lesson: any) => {
            // Priority: Supabase Name (Reliable) > Teachworks Name (Fallback)
            const fullStudentName = lesson.supabase_student_name || (lesson.participants?.[0]?.student_name) || "Student";
            
            // If the name is from Teachworks and in "Last, First" format, handle it
            let studentFirstName = "";
            if (fullStudentName.includes(",")) {
                studentFirstName = fullStudentName.split(",")[1].trim().split(" ")[0];
            } else {
                studentFirstName = fullStudentName.split(" ")[0];
            }

            return {
                id: lesson.id.toString(),
                title: lesson.service_name || lesson.name,
                start_date: lesson.from_datetime,
                end_date: lesson.to_datetime,
                description: lesson.description,
                studentName: studentFirstName,
                coachName: lesson.employee_name,
                status: lesson.status
            };
        });

        setSchedule(mappedSchedule);
      } catch (err: any) {
        console.error("Error fetching parent dashboard data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full p-4 lg:p-6 flex items-center justify-center bg-[#1f2e3b]">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full p-4 lg:p-6 flex items-center justify-center bg-[#1f2e3b]">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 lg:p-6 overflow-y-auto bg-[#1f2e3b]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
           <div className="h-[240px]">
                <StudentProfileCard 
                    name="Priya"
                    location="Location"
                    dob="April 11, 2016"
                    grade="3"
                    description="Sweet and outgoing personality"
                    glows="Excited to learn and share"
                    grows="Clarity with content"
                />
           </div>

           <div className="h-[200px]">
                <PostLessonTasks />
           </div>

           <div className="h-[200px]">
                <AttendanceStreak streak={8} />
           </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
            <div className="h-[140px]">
                <PaymentStatus sessionsLeft={24} />
            </div>

            <div className="flex-1 min-h-[516px] bg-[#B1E7D6] rounded-2xl p-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                <ScheduleList schedule={schedule} />
            </div>
        </div>

      </div>
    </div>
  );
}
