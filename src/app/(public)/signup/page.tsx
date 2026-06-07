"use client";

import { z } from "zod";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { EyeIcon } from "@/src/components/ui/icons";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { signUpNewUser } from "./actions";
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
    studentFirstName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(50, "Name cannot exceed 50 characters"),
    studentLastName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long")
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ErrorMessage = ({ message }: { message?: string[] }) => {
  if (!message || message.length === 0) return null;
  return <p className="text-red-600 text-sm mt-1 ml-1 mb-1">{message[0]}</p>;
};

type formErrors = {
  familyFirstName?: string[];
  familyLastName?: string[];
  studentFirstName?: string[];
  studentLastName?: string[];
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
};

export default function SignupPage() {
  const router = useRouter();

  const [familyFirstName, setFamilyFirstName] = useState<string>("");
  const [familyLastName, setFamilyLastName] = useState<string>("");
  const [studentFirstName, setStudentFirstName] = useState<string>("");
  const [studentLastName, setStudentLastName] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<formErrors>({});
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formDataToValidate = {
      familyFirstName,
      familyLastName,
      studentFirstName,
      studentLastName,
      email,
      password,
      confirmPassword,
    };

    const result = userSchema.safeParse(formDataToValidate);

    if (result.success) {
      setIsSubmitting(true);
      const response = await signUpNewUser(
        familyFirstName,
        familyLastName,
        studentFirstName,
        studentLastName,
        email,
        password,
      );
      setIsSubmitting(false);

      if (response?.success && response.studentId) {
        router.push(`/signup/account-created?studentId=${response.studentId}`);
      } else {
        alert("Unable to create account. Please try again.");
      }
    } else {
      const formattedErrors = result.error.flatten().fieldErrors;
      setErrors({
        familyFirstName: formattedErrors.familyFirstName,
        familyLastName: formattedErrors.familyLastName,
        studentFirstName: formattedErrors.studentFirstName,
        studentLastName: formattedErrors.studentLastName,
        email: formattedErrors.email,
        password: formattedErrors.password,
        confirmPassword: formattedErrors.confirmPassword,
      });
    }
  }

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
                src="/images/logos/talkmaze-logo-horizontal-color.svg"
                alt="TalkMaze Logo"
                width={150}
                height={120}
                className="h-[120px] w-auto object-contain"
                priority
              />
            </div>

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              <p className="text-xs font-semibold tracking-widest text-[#1F2E3B]/50 uppercase">
                Your Info
              </p>

              {/* Family First Name */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.familyFirstName}
                    type="text"
                    placeholder="First Name"
                    value={familyFirstName}
                    onChange={(e) => setFamilyFirstName(e.target.value)}
                  />
                </div>
                <ErrorMessage message={errors.familyFirstName} />
              </div>

              {/* Family Last Name */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.familyLastName}
                    type="text"
                    placeholder="Last Name"
                    value={familyLastName}
                    onChange={(e) => setFamilyLastName(e.target.value)}
                  />
                </div>
                <ErrorMessage message={errors.familyLastName} />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.email}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <ErrorMessage message={errors.email} />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.password}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <ErrorMessage message={errors.password} />
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.confirmPassword}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors p-3"
                  >
                    <EyeIcon
                      variant={showConfirmPassword ? "open" : "closed"}
                    />
                  </button>
                </div>
                <ErrorMessage message={errors.confirmPassword} />
              </div>

              <p className="text-xs font-semibold tracking-widest text-[#1F2E3B]/50 uppercase">
                Student Info
              </p>

              {/* Student First Name */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.studentFirstName}
                    type="text"
                    placeholder="Student First Name"
                    value={studentFirstName}
                    onChange={(e) => setStudentFirstName(e.target.value)}
                  />
                </div>
                <ErrorMessage message={errors.studentFirstName} />
              </div>

              {/* Student Last Name */}
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <Input
                    variant="light"
                    size="lg"
                    error={!!errors.studentLastName}
                    type="text"
                    placeholder="Student Last Name"
                    value={studentLastName}
                    onChange={(e) => setStudentLastName(e.target.value)}
                  />
                </div>
                <ErrorMessage message={errors.studentLastName} />
              </div>

              <p className="text-xs text-[#1F2E3B]/40 -mt-2">
                You can add more students later from your account.
              </p>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={isSubmitting}
                className="w-full h-11 md:h-[38px] mt-2 text-[20px]"
              >
                {isSubmitting ? "Creating Account..." : "Create an Account"}
              </Button>

              <div className="text-center mt-2">
                <p className="text-[#1F2E3B]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold hover:underline inline-flex items-center min-h-11 md:min-h-0 px-2 -mx-2">
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
