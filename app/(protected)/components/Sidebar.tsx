"use client"
import SideBarBox from "./SideBarBox"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function SideBar(){
  const pathname = usePathname();
  const [activeId, setActiveId] = useState(0);

  // keep local state in sync with URL
  useEffect(() => {
    if (pathname.startsWith("/lesson")) setActiveId(1);
    else if (pathname.startsWith("/coach")) setActiveId(2);
    else if (pathname.startsWith("/reward")) setActiveId(3);
    else setActiveId(0);
  }, [pathname]);

  return (
    <div className='flex flex-col gap-8 w-[204px] h-full px-6 pt-6 '>
      <Image src="/logo.png" alt="Talk Maze Logo" width={204} height={68}/>
      <SideBarBox id={0} name="Home"    state={activeId === 0} link='/home'   onSelect={() => setActiveId(0)} />
      <SideBarBox id={1} name="Lessons" state={activeId === 1} link='/lesson' onSelect={() => setActiveId(1)} />
      <SideBarBox id={2} name="Coach"   state={activeId === 2} link='/coach'  onSelect={() => setActiveId(2)} />
      <SideBarBox id={3} name="Rewards" state={activeId === 3} link='/reward' onSelect={() => setActiveId(3)} />
    </div>
  )
}
