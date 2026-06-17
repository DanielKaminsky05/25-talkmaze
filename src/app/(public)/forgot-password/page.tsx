"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { sendResetEmail } from "./actions";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function ForgotPasswordPage() {
  useDocumentTitle("Forgot Password");
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
    <div
      className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        <div
          className="w-full lg:w-[568px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 12px 12px 12px" }}
        >
          <div className="w-full max-w-[400px] flex flex-col gap-[18px]">
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/images/logos/talkmaze-logo-horizontal-color.svg"
                alt="TalkMaze Logo"
                width={150}
                height={145}
                className="h-[145px] w-auto object-contain"
                priority
              />
            </div>

            <div className="text-center mb-4">
              <h1 className="text-[24px] font-bold text-[#1F2E3B] mb-2">
                Forgot Password
              </h1>
              <p className="text-[#1F2E3B]/60 italic">
                Enter your email address and we'll send you a link to reset your
                password.
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
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={isSubmitting}
                className="w-full h-11 md:h-[38px] text-[20px]"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center mt-2">
                <Link
                  href="/login"
                  className="text-[#1F2E3B] font-bold hover:underline inline-flex items-center min-h-11 md:min-h-0 px-2 -mx-2"
                >
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
            src="/images/hero/photo.svg"
            alt="TalkMaze Illustration"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
