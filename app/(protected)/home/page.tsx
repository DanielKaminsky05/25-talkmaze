"use client";

import LessonProgressBar from "../components/LessonProgressBar";
import TokenBar from "../components/TokensBar";
import ReviewLessonCard from "../components/ReviewLesson";
import NextLessonCard from "../components/UpNextLesson";

export default function Home() {
  return (
    <div 
      className=" w-full p-8 mx-auto"
    >
      {/* INTERNAL GRID: Left Column (Lessons) + Right Column (Tokens) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8">
        
        {/* LEFT COLUMN: Main Dashboard Content */}
        <div className="flex flex-col gap-8">
            
            {/* 1. Progress Bar */}
            <LessonProgressBar current={8} total={24} />
            
            {/* 2. Video Component (Purple Banner) */}
            <div className="w-full h-[300px] rounded-2xl bg-[#2B4257]/20 border-2 border-dashed border-[#2B4257]/40 flex items-center justify-center text-[#B1E7D6]">
              Video Component Area
            </div>

            {/* 3. Bottom Row: Review & Up Next Cards */}
            <div className="flex flex-wrap gap-6">
              {/* Review Lesson Card */}
              <ReviewLessonCard 
                lessonNumber={7} 
                title="Overcoming Nerves" 
              />
              
              {/* Up Next Lesson Card */}
              <NextLessonCard 
                lessonNumber={9}
                title="Speech Blocking"
              />
            </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (Tokens & Schedule) */}
        <div className="flex flex-col gap-8">
          <TokenBar />
          
          {/* Schedule Component Placeholder */}
            <div className="w-[402px] h-[200px] rounded-2xl bg-[#B1E7D6]/10 border-2 border-dashed border-[#B1E7D6]/40 flex items-center justify-center text-[#B1E7D6]">
              Schedule Component Area
            </div>
        </div>

      </div>
    </div>
  );
}