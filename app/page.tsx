"use client"
import { useRouter } from "next/navigation"
export default function Page(){
    const router = useRouter();
    function validated(){
        router.push('/home')
    }
    return (
        <div>
            Auth page
            <p>Hello there</p>
                <button className = 'w-10 h-8 border-2 border-black ' onClick = {validated}>
                   Login
                </button>
        </div>
    )
}