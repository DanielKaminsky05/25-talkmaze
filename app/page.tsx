"use client"
import { useRouter } from "next/navigation"
import LoginPage from "./(public)/login/page";
export default function Page(){
    const router = useRouter();
    function validated(){
        router.push('/home')
    }
    return (
        <div>
            <LoginPage/>
        </div>
    )
}