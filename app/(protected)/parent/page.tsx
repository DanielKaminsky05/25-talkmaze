"use client";

import React, { useEffect, useState } from "react";
import StudentProfileCard from "./components/StudentProfileCard";
import PostLessonTasks from "./components/PostLessonTasks";
import AttendanceStreak from "./components/AttendanceStreak";
import PaymentStatus from "./components/PaymentStatus";
import ScheduleList from "../components/ScheduleList";

interface Appointment {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    description?: string;
}

export default function ParentDashboard() {
  const [schedule, setSchedule] = useState<Appointment[]>([
      {
          id: "1",
          title: "Explorer - Lesson 2",
          start_date: "2024-05-11T11:45:00",
          end_date: "2024-05-11T12:45:00"
      },
      {
          id: "2",
          title: "Explorer - Lesson 3",
          start_date: "2024-05-18T11:45:00",
          end_date: "2024-05-18T12:45:00"
      },
      {
          id: "3",
          title: "Explorer - Lesson 4",
          start_date: "2024-05-25T11:45:00",
          end_date: "2024-05-25T12:45:00"
      }
  ]);

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
