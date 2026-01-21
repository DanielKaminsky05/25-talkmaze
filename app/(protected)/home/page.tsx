
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


export default function Home() {
  const pathname = usePathname();
    const [activeId, setActiveId] = useState(0);
  useEffect(() => {
      if (pathname.startsWith("../login")) setActiveId(4);
      else setActiveId(0);
    }, [pathname]);

  return (
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