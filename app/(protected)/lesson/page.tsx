"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="w-full h-screen flex justify-center px-4 overflow-hidden">
      {/* Dark container */}
      <div className="bg-[#1f2e3b] w-full max-w-[94%] min-w-[300px] text-white rounded-2xl p-6 flex flex-col shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]">
        
        {/* TOP DASHBOARD SECTION */}
        <div className="w-full flex justify-center shrink-0 pr-4 mb-6">
          <div className="flex flex-wrap justify-center gap-6 w-full">
            
            {/* LESSON PROGRESS BOX */}
            <div className="bg-white text-[#1f2e3b] rounded-2xl p-5 w-full max-w-[350px] md:max-w-[724px] h-[100px] flex flex-col justify-between shadow-md">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Lesson Progress</span>
                <span className="text-gray-500">8/24</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[#3d5a73] rounded-full"></div>
              </div>
            </div>

            {/* BADGES BOX */}
            <div className="bg-white text-[#1f2e3b] rounded-2xl p-4 w-full max-w-[350px] h-[100px] flex flex-col shadow-md">
               <div className="font-bold text-sm mb-2">Badges</div>
               <div className="flex gap-2 text-2xl">
                 <span>🧭</span>
                 <span>🔭</span>
                 <span>⭐️</span>
                 <span>🏹</span>
                 <span>🍍</span>
                 <span>🗺️</span>
                 <span>🐚</span>
               </div>
            </div>

          </div>
        </div>

        {/* LESSON GRID */}
        <div
          className="grid gap-6 justify-center auto-rows-[244px] 
                     grid-cols-[repeat(auto-fit,minmax(250px,350px))]
                     flex-grow overflow-y-auto pr-2
                     
                     [&::-webkit-scrollbar]:w-2
                     [&::-webkit-scrollbar-track]:bg-transparent
                     [&::-webkit-scrollbar-thumb]:bg-[#3d5a73]
                     [&::-webkit-scrollbar-thumb]:rounded-full
                     [&::-webkit-scrollbar-thumb]:hover:bg-[#4d6f8c]"
        >
          <LessonCard lessonNumber={1} title="Intro to Debate" />
          <LessonCard lessonNumber={2} title="Constructing an Argument" />
          <LessonCard lessonNumber={3} title="Debate Speeches" />
          <LessonCard
            lessonNumber={4}
            title="Speaker Responsibilities for British Parliamentary Debate"
          />
          <LessonCard
            lessonNumber={5}
            title="How to Win from Every Position in BP"
          />
          <LessonCard lessonNumber={6} title="Practice Session" />
          <LessonCard lessonNumber={7} title="Overcoming Nerves" />
          <LessonCard
            lessonNumber={8}
            title="Strategies for Breathing and Speaking"
          />
          <LessonCard lessonNumber={9} title="Speech Blocking" />
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lessonNumber, title }: any) {
  return (
    <div className="relative w-full max-w-[350px] h-full max-h-[236px] rounded-2xl flex flex-col justify-center bg-[#adf0c6] p-4">
      {/* TOP-LEFT LESSON BOX */}
      <div className="absolute top-[15px] left-[20px] w-[103px] h-[35px] rounded-[9px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] bg-white text-black flex items-center justify-center px-2 py-1">
        <b>Lesson {lessonNumber}</b>
      </div>

      {/* TOP-RIGHT ICON BOX */}
      <div className="absolute top-[15px] right-[20px] w-[67px] h-[63px] rounded-[8px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] text-[50px] bg-white text-black flex items-center justify-center">
        🎓
      </div>

      {/* BOTTOM BOX */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[80px] rounded-t-none rounded-b-[12px] bg-[#65cfad] text-white flex items-center justify-center">
        <span className="w-full text-center break-words max-w-[280px]">
          <b>{title}</b>
        </span>
      </div>
    </div>
  );
}