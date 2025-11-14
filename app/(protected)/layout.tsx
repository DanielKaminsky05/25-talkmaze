import NavigationBar from "./components/NavigationBar"
import { ReactNode } from "react"
import SideBar from "./components/Sidebar"
export default function Layout({children} : {children: ReactNode}){
    return (
      
             <div className = 'flex flex-row w-screen h-screen'>
                <SideBar/>
                <div className = 'flex flex-1 flex-col '>
                    <NavigationBar />
                    {children}
                </div>
                
            </div>

        
         
    ) 
        
}
