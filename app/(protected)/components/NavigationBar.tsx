"use client"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux";

import { RootState } from "@/Store/Store";
import Image from "next/image";
//Navigation Bar Component
export default function NavigationBar(){
    const router = useRouter();
    const page = useSelector((state: RootState) => state.navigation.page);
    const prefix = useSelector((state:RootState) => state.navigation.prefix)
    function goBack(){
        router.back();
    }

    const title = `${prefix} ${page}`
    return (
        <div className = 'relative left-9 min-w-[100px] h-[66px] flex flex-row items-center' onClick = {goBack}>
            <Image src = '/caret.png' alt = 'caret' width = {36} height = {34.88}/>
            <p className = 'text-white'>{title}</p>
        </div>
    )
}