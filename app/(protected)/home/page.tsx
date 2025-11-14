
"use client"
import { AppDispatch } from "@/Store/Store";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setButtonOn } from "@/Store/SideBarSlice";
import { setPath } from "@/Store/NavigationSlice";
export default function Home() {
  
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setButtonOn(0));
    dispatch(setPath("DashBoard"))
  },[])

  return (
    <div className="flex flex-1 justify-center items-center relative h-screen ">
      <p>This is home</p>
      
    </div>
  );
}
