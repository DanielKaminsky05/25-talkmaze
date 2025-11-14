"use client"
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setButtonOn } from "@/Store/SideBarSlice";
import Link from "next/link";
type Props = {
    id: number,
    name: string,
    state: boolean,
    link: string,
    
}

//SideBar Individual Box
export default function SideBarBox({id,name, state, link}: Props){
    
    let backgroundColor = state ? "bg-[#B1E7D6]" : "bg-[#1F2E3B]";
    let textColor = state ? "text-[#1F2E3B]": "text-[#B1E7D6]";

    const dispatch = useDispatch();
    //function to toggle the colors of the buttons
    function toggle(){
        console.log("Set: " + id)
        dispatch(setButtonOn(id));
    }
    return (
        <Link href = {link}>
            <div className = {`flex justify-center items-center w-[204px] h-[78px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] ${backgroundColor} rounded-2xl`} onClick = {toggle}>
                <p className = {`${textColor} text-center`}>{name}</p>
            </div>
        </Link>
      
    )
}