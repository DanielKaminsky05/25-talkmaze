"use client";

import LessonProgressBar from "../components/LessonProgressBar";
import TokenBar from "../components/TokensBar";

export default function Home() {
  return (
    /* 
       REMOVED: The outer 'min-h-screen' wrapper.
       NOW: We return ONLY the Dashboard Card. 
       
       This allows your 'layout.tsx' (where the Sidebar likely lives) 
       to handle the positioning without this component fighting for full screen width.
    */
    <div 
      className="
        w-full max-w-[1400px] 
        bg-[#131b24] 
        rounded-[40px] 
        p-8 
        mx-auto 
        my-10
        shadow-[inset_0px_24px_30px_-12px_rgba(0,0,0,0.3)]
      "
    >
      {/* INTERNAL GRID: Left Column (Lessons) + Right Column (Tokens) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-8">
            <LessonProgressBar current={8} total={24} />
            
            {/* Video Component Placeholder */}
            <div className="w-full h-[300px] rounded-2xl bg-[#2B4257]/20 border-2 border-dashed border-[#2B4257]/40 flex items-center justify-center text-[#B1E7D6]">
              Video Component Area
            </div>
        </div>

        {/* RIGHT COLUMN */}
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