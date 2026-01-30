"use client";

import React, { useEffect, useState } from "react";
import LessonProgressBar from "../components/LessonProgressBar";
import TokenBar from "../components/TokensBar";
import ReviewLessonCard from "../components/ReviewLesson";
import NextLessonCard from "../components/UpNextLesson";
import ScheduleList from "../components/ScheduleList";

interface ProgressData {
  current: number;
  total: number;
}

export default function Home() {
  const [progress, setProgress] = useState<ProgressData>({ current: 0, total: 24 });
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/lesson-progress");
        if (res.ok) {
          const data = await res.json();

          setProgress({
            current: typeof data.completed === 'number' ? data.completed : 8,
            total: typeof data.total === 'number' ? data.total : 24
          });
          if (data.studentId) {
            setStudentId(data.studentId);
          }
        }
      } catch (e) {
        console.error("Failed to fetch progress", e);
      }
    }
    fetchData();
  }, []);

  return (
    <div
      className=" w-full p-8 mx-auto"
    >

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 w-full">


        <div className="flex flex-col gap-8 w-full">


          <LessonProgressBar current={progress.current} total={progress.total} />


          <div className="w-full h-[300px] rounded-2xl bg-[#2B4257]/20 border-2 border-dashed border-[#2B4257]/40 flex items-center justify-center text-[#B1E7D6]">
            Video Component Area
          </div>


          <div className="grid gap-12 grid-cols-2 relative right-[5%] flex-1">

            <ReviewLessonCard
              lessonNumber={7}
              title="Overcoming Nerves"
            />


            <NextLessonCard
              lessonNumber={9}
              title="Speech Blocking"
            />
          </div>
        </div>


        <div className="flex flex-col gap-8">
          <TokenBar />


          <ScheduleList studentId={studentId || undefined} />
        </div>

      </div>
    </div>
  );
}