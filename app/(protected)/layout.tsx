"use client";

import NavigationBar from "./components/NavigationBar"
import { ReactNode } from "react"
import SideBar from "./components/Sidebar"
import { usePathname } from "next/navigation"

export default function Layout({children} : {children: ReactNode}){
    const pathname = usePathname();

    // Check if pathname starts with /profiles to exclude sidebar/navbar from profiles page: This is a temporary fix solution
    if (pathname?.startsWith('/profiles')) {
        return <>{children}</>;
    }

    return (
      
             <div className = 'flex flex-row w-screen h-screen overflow-hidden'>
                <SideBar/>
                <div className = 'flex flex-1 flex-col overflow-y-auto pl-6 pr-6'>
                    <NavigationBar/>
                    <div className="bg-[#1f2e3b] w-full flex-1 min-w-[300px] rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] mb-6">
                        {children}
                    </div>
                </div>
                
            </div>

        
         
    ) 
        
}
