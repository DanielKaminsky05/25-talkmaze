"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { EyeIcon } from "@/src/components/ui/icons";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { updatePassword } from "./actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);

    if (result.success) {
      // Redirect to login on success
      router.push(
        "/login?message=Password reset successful. Please login with your new password.",
      );
    } else {
      setError(result.error || "Failed to update password. Please try again.");
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
                Reset Password
              </h1>
              <p className="text-[#1F2E3B]/60 italic">
                Enter your new password below.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-[10px] text-sm font-medium bg-red-50 text-red-600">
                {error}
              </div>
            )}

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors p-3"
                >
                  <EyeIcon variant={showPassword ? "open" : "closed"} />
                </button>
              </div>

              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
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
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
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
