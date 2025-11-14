import NavigationBar from "./components/NavigationBar"
import Providers from "../Providers"
import { ReactNode } from "react"
import SideBar from "./components/Sidebar"
import AvatorIcon from "./components/AvatorIcon"
import StartVideoLessonBox from "./components/StartVideoLessonBox"
export default function Layout({children} : {children: ReactNode}){
    return (
       
            <Providers >
          
           
             <div className = 'flex flex-row w-screen h-screen ' style={{ backgroundColor: '#2B4257' }}>
                <SideBar/>
                <div className = 'flex flex-1 flex-col '>
                  <div className = 'flex flex-row items-center justify-between px-8 py-6'>
                    
                    <NavigationBar />
                    <div className = 'flex flex-row gap-10'>
                        <StartVideoLessonBox/>
                        <AvatorIcon/>
                    </div>
                  </div>
                    
                    {children}
                </div>
                
            </div>
          
         
          
        </Providers>

        
         
    )
    
        
}