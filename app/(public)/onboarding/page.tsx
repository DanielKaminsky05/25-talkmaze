"use client"
import {z} from 'zod';
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const onBoardSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  grade: z.int(),
  notes: z.string(),
})

export default function Onboarding(){
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [grade, setGrade] = useState<Int16Array>();
  const [notes, setNotes] = useState<string>("");



  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
  
    const formDataToValidate = {
      firstName: firstName,
      lastName: lastName,
      address: address,
      grade: grade,
      note: notes,
    }
  }
    //const result = userSchema.safeParse(formDataToValidate);


return(
       <div className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}>
      
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        
        <div
          className="w-full lg:w-[1229px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 12px 12px 12px" }}
        >
          <div className="w-full max-w-[400px] flex flex-col gap-[18px]">
            
            <div className="flex flex-col items-center mb-4">
              <Image
                src="/talkmaze_logo.svg"
                alt="TalkMaze Logo"
                width={150}
                height={120}
                className="h-[120px] w-auto object-contain"
                priority
              />
            </div>

          
            <form className="flex flex-col gap-[14px]" onSubmit={handleSubmit}>
            <div>
              <p className="text-[#A8A8A8]">Please enter your full name.</p>
              {/**First Name field div: */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="relative h-[58px]">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]`}
                  onChange={(e)=>setFirstName(e.target.value)}
                />
                </div>
              </div>
            </div>

              {/**Last Name field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]`}
                  onChange={(e)=>setLastName(e.target.value)}
                />
                </div>
              </div>
              
            <div className='mt-3'>
              <p className="text-[#A8A8A8]">Please enter your address.</p>
              {/**address field div: */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="relative h-[58px]">
                <input
                  type="text"
                  value={address}
                  onChange={(e)=>setAddress(e.target.value)}
                  placeholder="Address"
                  className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]`}
                />
                </div>
              </div>
            </div>

            <div className='mt-3'>
              <p className="text-[#A8A8A8]">Any additional notes?</p>
              {/**additional notes field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[150px] w-[400px]">
                <input
                  type="text"
                  value={notes}
                  onChange={(e)=>setNotes(e.target.value)}
                  placeholder="Notes..."
                  className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]`}
                />
                </div>
              </div>
            </div>

              <button
                type="submit"
                className="w-1/2 mx-auto h-[38px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
              >
                Submit
              </button>             

              <div className="text-center mt-2">
                <p className="text-[#1F2E3B]">
                  <Link href="/signup" className="font-bold hover:underline">
                    exit
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
);

   
}