"use client";

import { z } from "zod";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { EyeIcon } from "@/components/ui/icons";
import { signUpNewUser } from "../signup/actions";
import { PassThrough } from "stream";
import { useRouter } from "next/navigation";

const userSchema = z
  .object({
    familyFirstName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters long")
      .max(50, "Name cannot exceed 50 characters"),
    familyLastName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters long")
      .max(50, "Name cannot exceed 50 characters"),
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must have at least one uppercase character")
      .regex(/[a-z]/, "Password must have at least one lowercase character")
      .regex(
        /[@$!%*?&#-~^]/,
        "Password must have at least one special character",
      )
      .regex(/\d/, "Password must have at least one number"),
    confirmPassword: z.string(),
    masterPin: z
      .string()
      .regex(/^\d+$/, "Master pin must contain only numbers")
      .regex(/^\d{4}$/, "Master pin must be exactly 4 digits"),
    confirmMasterPin: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.masterPin === data.confirmMasterPin, {
    message: "Master pins must match",
    path: ["confirmMasterPin"],
  });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ErrorMessage = ({ message }: { message?: string[] }) => {
  if (!message || message.length === 0) return null;
  return <p className="text-red-600 text-sm mt-1 ml-1 mb-1">{message[0]}</p>;
};

export default function SignupPage() {
  const router = useRouter();

  const [familyFirstName, setFamilyFirstName] = useState<string>("");
  const [familyLastName, setFamilyLastName] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<formErrors>({});
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [masterPin, setMasterPin] = useState<string>("");
  const [showMasterPin, setShowMasterPin] = useState(false);
  const [confirmMasterPin, setConfirmMasterPin] = useState<string>("");
  const [showConfirmMasterPin, setShowConfirmMasterPin] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formDataToValidate = {
      familyFirstName: familyFirstName,
      familyLastName: familyLastName,
      email: email,
      password: password,
      confirmPassword: confirmPassword,
      masterPin: masterPin,
      confirmMasterPin: confirmMasterPin,
    };

    const result = userSchema.safeParse(formDataToValidate);

    //Redirects the user to the home page if successful:
    if (result.success) {
      console.log("Signing up new user");
      await signUpNewUser(
        familyFirstName,
        familyLastName,
        email,
        password,
        masterPin,
      );
      router.push("/home");
    } else {
      console.log(result.error.flatten().fieldErrors);

      const formattedErrors = result.error.flatten().fieldErrors;
      setErrors({
        familyFirstName: formattedErrors.familyFirstName,
        familyLastName: formattedErrors.familyLastName,
        email: formattedErrors.email,
        password: formattedErrors.password,
        confirmPassword: formattedErrors.confirmPassword,
        masterPin: formattedErrors.masterPin,
        confirmMasterPin: formattedErrors.confirmMasterPin,
      });
    }
  }

  type formErrors = {
    familyFirstName?: string[];
    familyLastName?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    masterPin?: string[];
    confirmMasterPin?: string[];
  };

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

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              {/**Family First Name field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Family First Name"
                    value={familyFirstName}
                    //add red border if error
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.familyFirstName ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                    onChange={(e) => setFamilyFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <ErrorMessage message={errors.familyFirstName} />
                </div>
              </div>
              {/**Family Last Name div */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Family Last Name"
                    value={familyLastName}
                    //add red border if error
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.familyLastName ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                    onChange={(e) => setFamilyLastName(e.target.value)}
                  />
                </div>
                <div>
                  <ErrorMessage message={errors.familyLastName} />
                </div>
              </div>

              {/**email field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.email ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                  />
                </div>
                <ErrorMessage message={errors.email} />
              </div>
              {/**master pin field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showMasterPin ? "text" : "password"}
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    placeholder="Master Pin"
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.masterPin ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPin(!showMasterPin)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon variant={showMasterPin ? "open" : "closed"} />
                  </button>
                </div>

                <ErrorMessage message={errors.masterPin} />
              </div>
              {/*confirm master pin field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showConfirmMasterPin ? "text" : "password"}
                    placeholder="Confirm Master PIN"
                    value={confirmMasterPin}
                    onChange={(e) => setConfirmMasterPin(e.target.value)}
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.confirmMasterPin ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmMasterPin(!showConfirmMasterPin)
                    }
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon
                      variant={showConfirmMasterPin ? "open" : "closed"}
                    />
                  </button>
                </div>
                <ErrorMessage message={errors.confirmMasterPin} />
              </div>

              {/**password field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.password ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon variant={showPassword ? "open" : "closed"} />
                  </button>
                </div>

                <ErrorMessage message={errors.password} />
              </div>

              {/**confirm password field div: */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.password ? "border-red-500" : "border-[#1F2E3B]"} rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon
                      variant={showConfirmPassword ? "open" : "closed"}
                    />
                  </button>
                </div>
                <ErrorMessage message={errors.confirmPassword} />
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
