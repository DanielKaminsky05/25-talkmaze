"use client"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image";
import StartVideoLessonBox from "./StartVideoLessonBox";
import AvatorIcon from "./AvatorIcon";

//Navigation Bar Component
export default function NavigationBar(){
    const router = useRouter();
    const pathname = usePathname();

    function goBack(){
        router.back();
    }

    const prefix = "Student";
    let page = "Dashboard";

    if (pathname.startsWith("/lesson")) page = "Lessons";
    else if (pathname.startsWith("/coach")) page = "Coach";
    else if (pathname.startsWith("/reward")) page = "Rewards";

    const title = `${prefix} ${page}`;

    return (
        <div className="flex flex-row items-center justify-between px-8 py-6 w-full">
            <div className='relative left-9 min-w-[100px] h-[66px] flex flex-row items-center' onClick={goBack}>
                <Image src='/caret.png' alt='caret' width={36} height={34.88}/>
                <p className='text-white'>{title}</p>
            </div>
            <div className='flex flex-row gap-10'>
                <StartVideoLessonBox/>
                <AvatorIcon/>
            </div>
        </div>
    )
}
