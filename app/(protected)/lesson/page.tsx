"use client"
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setButtonOn } from "@/Store/SideBarSlice";
export default function LessonPage(){
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setButtonOn(1));
  },[])
    return (
        <div className = "flex flex-1 justify-center items-center relative h-screen left-6">
            Lesson Page
        </div>
    )
}