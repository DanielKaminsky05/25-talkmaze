"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { sendResetEmail } from "./actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const result = await sendResetEmail(email);

    if (result.success) {
      setMessage({
        type: "success",
        text: "Check your email for a password reset link.",
      });
      setEmail("");
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to send reset email. Please try again.",
      });
    }
    setIsSubmitting(false);
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}>
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        <div
          className="w-full lg:w-[568px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 12px 12px 12px" }}
        >
          <div className="w-full max-w-[400px] flex flex-col gap-[18px]">
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/talkmaze_logo.svg"
                alt="TalkMaze Logo"
                width={150}
                height={145}
                className="h-[145px] w-auto object-contain"
                priority
              />
            </div>

            <div className="text-center mb-4">
              <h1 className="text-[24px] font-bold text-[#1F2E3B] mb-2">Forgot Password</h1>
              <p className="text-[#1F2E3B]/60 italic">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {message && (
              <div
                className={`p-4 rounded-[10px] text-sm font-medium ${
                  message.type === "success" 
                    ? "bg-[#DAFBE8] text-[#1D7A41]" 
                    : "bg-red-50 text-red-600"
                }`}
              >
                {message.text}
              </div>
            )}

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              <div className="relative h-[58px]">
                <input
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] border-[#1F2E3B] rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[38px] bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="text-center mt-2">
                <Link href="/login" className="text-[#1F2E3B] font-bold hover:underline">
                  Back to Login
                </Link>
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
