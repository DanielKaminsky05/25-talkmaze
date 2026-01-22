"use client";

import LessonProgressBar from "../components/LessonProgressBar";
import TokenBar from "../components/TokensBar";
import ReviewLessonCard from "../components/ReviewLesson";
import NextLessonCard from "../components/UpNextLesson";

<<<<<<< HEAD
=======
"use client"
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react";
import SideBarBox from "../components/SideBarBox"
import Image from "next/image"
import { relative } from "path";
//import {signOut} from "@/public/login/actions";



// async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     const router = useRouter();
//       e.preventDefault();
//       const result = await signOut();
//       //Redirects the user to the sign in page if successful:
//       if(result.success){
//           router.push('app/protected/home')
//       }else{
//         console.log("Error: login failed", result.error)
//       }
      
//     }


>>>>>>> Signup/LogIn
export default function Home() {
  const pathname = usePathname();
    const [activeId, setActiveId] = useState(0);
  useEffect(() => {
      if (pathname.startsWith("../login")) setActiveId(4);
      else setActiveId(0);
    }, [pathname]);

  return (
<<<<<<< HEAD
    <div 

     

      className=" w-full p-8 mx-auto"
    >
      {/* INTERNAL GRID: Left Column (Lessons) + Right Column (Tokens) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 w-full">
        
        {/* LEFT COLUMN: Main Dashboard Content */}
        <div className="flex flex-col gap-8 w-full">
            
            {/* 1. Progress Bar */}
            <LessonProgressBar current={8} total={24} />
            
            {/* 2. Video Component (Purple Banner) */}
            <div className="w-full h-[300px] rounded-2xl bg-[#2B4257]/20 border-2 border-dashed border-[#2B4257]/40 flex items-center justify-center text-[#B1E7D6]">
              Video Component Area
            </div>

            {/* 3. Bottom Row: Review & Up Next Cards */}
          <div className="grid w-full gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-2">
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
            <div className="w-[100%] h-[80%] rounded-2xl bg-[#B1E7D6]/10 border-2 border-dashed border-[#B1E7D6]/40 flex items-center justify-center text-[#B1E7D6]">
              Schedule Component Area
            </div>
        </div>

      </div>
    </div>
  );
}
=======
    <div className="flex flex-1 justify-center items-center relative">
      <p>This is home</p>

      <div style = {{position: "relative", left:-810, bottom:-450 }} className = 'flex flex-col gap-8 w-[204px] h-full px-6 pt-6 '>
        {/* <Image src="/logo.png" alt="Talk Maze Logo" width={204} height={68}/> */}
        <SideBarBox id={0} name="Sign out"    state={true} link='../login'   onSelect={() => setActiveId(4)} /> 
      </div>
      
    </div>
  );
}
//CHANGE setActiveI to handleSubmit!!!!!!!!!!!!!!!!!!!!!!!!
>>>>>>> Signup/LogIn
