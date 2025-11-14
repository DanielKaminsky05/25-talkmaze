"use client"
import SideBarBox from "./SideBarBox"
import { useSelector,useDispatch } from "react-redux"
import {RootState,AppDispatch} from '../../../Store/Store'
import Image from "next/image"
import Link from "next/link"

//Side Bar Navigation Component
export default function SideBar(){

    const homeState = useSelector((state: RootState) => state.sideBar.homeButton);
    const lessonState = useSelector((state: RootState) => state.sideBar.lessonButton);
    const coachState = useSelector((state:RootState) => state.sideBar.coachButton);
    const rewardState = useSelector((state: RootState) => state.sideBar.rewardButton);
    
    return (
        <div className = 'flex flex-col gap-8 w-[204px] h-full px-6 pt-6 '>
            <Image src = "/logo.png" alt = "Talk Maze Logo" width = {204} height = {68}/>
            <SideBarBox id = {0}name = "Home" state = {homeState} link = '/home'/>
            <SideBarBox id = {1} name = "Lessons" state = {lessonState} link = '/lesson'/>
            <SideBarBox id = {2} name = "Coach" state = {coachState} link = '/coach'/>
            <SideBarBox id = {3} name = "Rewards" state = {rewardState} link = '/reward'/>
        </div>
    )
}