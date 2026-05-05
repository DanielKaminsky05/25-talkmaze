"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { EyeIcon } from "@/components/ui/icons";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const schema = z
  .object({
    parentFirstName: z.string().trim().min(1, "First name is required"),
    parentLastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must have at least one uppercase character")
      .regex(/[a-z]/, "Password must have at least one lowercase character")
      .regex(
        /[@$!%*?&#\-~^]/,
        "Password must have at least one special character",
      )
      .regex(/\d/, "Password must have at least one number"),
    confirmPassword: z.string(),
    studentFirstName: z
      .string()
      .trim()
      .min(1, "Student first name is required"),
    studentLastName: z.string().trim().min(1, "Student last name is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type FormErrors = Partial<Record<keyof z.infer<typeof schema>, string[]>>;

const inputClass = (hasError: boolean) =>
  `w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${
    hasError ? "border-red-500" : "border-[#1F2E3B]"
  } rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`;

const ErrorMsg = ({ msg }: { msg?: string[] }) =>
  msg?.length ? (
    <p className="text-red-600 text-sm mt-1 ml-1">{msg[0]}</p>
  ) : null;

export default function MinimalSignup() {
  const router = useRouter();

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse({
      parentFirstName,
      parentLastName,
      email,
      password,
      confirmPassword,
      studentFirstName,
      studentLastName,
    });

    if (!result.success) {
      const fieldErrors = z.flattenError(result.error).fieldErrors;
      setErrors(fieldErrors as FormErrors);
      return;
    }

    sessionStorage.setItem(
      "signup",
      JSON.stringify({
        email,
        password,
        parentFirstName,
        parentLastName,
        studentFirstName,
        studentLastName,
      }),
    );
    router.push("/payments?studentId=new");
  };

  return (
    <div
      className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        {/* Left panel — form */}
        <div
          className="w-full lg:w-[568px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10 overflow-y-auto"
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
              {/* Parent section label */}
              <p className="text-sm font-semibold text-[#1F2E3B]/50 uppercase tracking-wider -mb-2">
                Your Info
              </p>

              {/* Parent First Name */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    className={inputClass(!!errors.parentFirstName)}
                  />
                </div>
                <ErrorMsg msg={errors.parentFirstName} />
              </div>

              {/* Parent Last Name */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    className={inputClass(!!errors.parentLastName)}
                  />
                </div>
                <ErrorMsg msg={errors.parentLastName} />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass(!!errors.email)}
                  />
                </div>
                <ErrorMsg msg={errors.email} />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass(!!errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon variant={showPassword ? "open" : "closed"} />
                  </button>
                </div>
                <ErrorMsg msg={errors.password} />
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass(!!errors.confirmPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    <EyeIcon
                      variant={showConfirmPassword ? "open" : "closed"}
                    />
                  </button>
                </div>
                <ErrorMsg msg={errors.confirmPassword} />
              </div>

              {/* Student section label */}
              <p className="text-sm font-semibold text-[#1F2E3B]/50 uppercase tracking-wider -mb-2 mt-2">
                Student Info
              </p>

              {/* Student First Name */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Student First Name"
                    value={studentFirstName}
                    onChange={(e) => setStudentFirstName(e.target.value)}
                    className={inputClass(!!errors.studentFirstName)}
                  />
                </div>
                <ErrorMsg msg={errors.studentFirstName} />
              </div>

              {/* Student Last Name */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Student Last Name"
                    value={studentLastName}
                    onChange={(e) => setStudentLastName(e.target.value)}
                    className={inputClass(!!errors.studentLastName)}
                  />
                </div>
                <ErrorMsg msg={errors.studentLastName} />
              </div>

              <p className="text-sm text-[#1F2E3B]/50 text-center">
                Note: You can onboard more students later.
              </p>

              <button
                type="submit"
                className="w-full h-[38px] mt-2 bg-[#B1E7D6] rounded-xl text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
              >
                Continue to Payment
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

        {/* Right panel — illustration */}
        <div
          className="hidden lg:block relative flex-1 bg-[#65CFAD] overflow-hidden"
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
