"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}>
      
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        
        <div
          className="w-full lg:w-[568px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 0px 0px 12px" }}
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

 
            <form className="flex flex-col gap-[18px]">
              
              <div className="relative h-[58px]">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] border-[#1F2E3B] rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors"
                />
              </div>

              <div className="relative h-[58px]">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] border-[#1F2E3B] rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors"
                />
              </div>

              <div className="relative h-[58px]">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] border-[#1F2E3B] rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                >
                  {showPassword ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                     <circle cx="12" cy="12" r="3"/>
                   </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>

              <div className="relative h-[58px]">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] border-[#1F2E3B] rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors"
                />
                 <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                >
                  {showConfirmPassword ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                     <circle cx="12" cy="12" r="3"/>
                   </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="submit"
                className="w-full h-[38px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
              >
                Create an Account
              </button>

              <div className="text-center mt-2">
                <p className="text-[#1F2E3B]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold hover:underline">
                    Login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <div
          className="hidden lg:block relative w-[661px] bg-[#65CFAD] overflow-hidden"
          style={{ borderRadius: "0px 8px 8px 0px" }}
        >
          <Image
            src="/photo.svg"
            alt="TalkMaze Illustration"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}