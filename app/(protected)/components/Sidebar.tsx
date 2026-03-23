"use client";
import SideBarBox from "./SideBarBox";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Sidebar Component
export default function SideBar() {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // keep local state in sync with URL
  useEffect(() => {
    if (pathname.startsWith("/parent")) setActiveId(10); // Parent Home
    else if (pathname.startsWith("/lesson")) setActiveId(1);
    else if (pathname.startsWith("/message")) setActiveId(2);
    else if (pathname.startsWith("/reward")) setActiveId(3);
    else setActiveId(0);
  }, [pathname]);

  return (

    <div className='flex flex-col gap-8 w-auto h-full px-6 pt-6 '>
      <Image src="/logo.png" alt="Talk Maze Logo" width={204} height={68}/>
      {pathname.startsWith("/parent") ? (
        <>
          <SideBarBox id={10} name="Home"     state={activeId === 10} link='/parent'   onSelect={() => setActiveId(10)} />
          <SideBarBox id={11} name="Lessons"  state={activeId === 11} link='/parent/lessons' onSelect={() => setActiveId(11)} />
          <SideBarBox id={12} name="Schedule" state={activeId === 12} link='/parent/schedule' onSelect={() => setActiveId(12)} />
          <SideBarBox id={13} name="Coach"    state={activeId === 13} link='/coach'  onSelect={() => setActiveId(13)} />
        </>
      ) : (
        <>
          <SideBarBox id={0} name="Home"    state={activeId === 0} link='/home'   onSelect={() => setActiveId(0)} />
          <SideBarBox id={1} name="Lessons" state={activeId === 1} link='/lesson' onSelect={() => setActiveId(1)} />
          <SideBarBox id={2} name="Messages"   state={activeId === 2} link='/message'  onSelect={() => setActiveId(2)} />
          <SideBarBox id={3} name="Rewards" state={activeId === 3} link='/reward' onSelect={() => setActiveId(3)} />
          <SideBarBox id={4} name="Manage Profile" state={activeId === 4} link='/manageProfile' onSelect={() => setActiveId(4)}/>
        </>
      )}
    </div>
  )

}
