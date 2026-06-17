"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { EyeIcon } from "@/src/components/ui/icons";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { logInUser } from "./actions";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";
import { useRouter } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function LoginPage() {
  useDocumentTitle("Login");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const result = await logInUser(email, password);
    //Redirects the user to the home page if successful:

    console.log("Inside handle submit");
    if (result?.success) {
      router.push("/profiles");
    } else {
      console.log("Error: login failed", result);
      setLoginError(result?.message ?? "Login failed. Please try again.");
    }
  }

  const [successMessage] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("message");
    }
    return null;
  });

  return (
    <div
      className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        <div
          className="w-full lg:w-[568px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 0px 0px 12px" }}
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

            {successMessage && (
              <div className="p-4 rounded-[10px] text-sm font-medium bg-[#DAFBE8] text-[#1D7A41] mb-2 text-center">
                {successMessage}
              </div>
            )}

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!loginError}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="Email"
                />
              </div>

              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!loginError}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors p-3"
                >
                  <EyeIcon variant={showPassword ? "open" : "closed"} />
                </button>
              </div>
              {loginError && (
                <p
                  role="alert"
                  className="text-red-600 text-sm -mt-3 ml-1 mb-1"
                >
                  {loginError}
                </p>
              )}

              <div className="flex justify-end -mt-2">
                <Link
                  href="/forgot-password"
                  className="text-[16px] text-[#1F2E3B]/60 hover:text-[#65CFAD] transition-colors font-medium inline-flex items-center min-h-11 md:min-h-0 px-2 -mx-2"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full h-11 md:h-[38px] text-[20px] "
              >
                Login
              </Button>

              <Button
                asChild
                variant="accent"
                size="lg"
                className="w-full h-11 md:h-[38px] text-[20px]"
              >
                <Link href="/signup">Create an Account</Link>
              </Button>
            </form>

            <div className="relative h-[20px] w-full flex items-center justify-center my-2">
              <div className="absolute left-0 w-[40%] border-t border-[#2B4257]"></div>
              <span className="text-[20px] font-semibold text-[#1F2E3B] px-2">
                or
              </span>
              <div className="absolute right-0 w-[40%] border-t border-[#2B4257]"></div>
            </div>

            <button
              type="button"
              className="w-full h-[49px] bg-white flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors border-[0.3px] border-[#1f2e3b] rounded-[10px]"
            >
              <Image
                src="/images/brands/google_logo.svg"
                alt="Google Logo"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span className="text-[20px] font-semibold text-[#1F2E3B]">
                Continue with Google
              </span>
            </button>
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
