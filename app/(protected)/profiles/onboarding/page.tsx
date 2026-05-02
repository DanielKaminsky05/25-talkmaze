"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Inter } from "next/font/google";
import { z } from "zod";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const schema = z
  .object({
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Please enter a valid phone number")
      .regex(/^[\d\s\+\-\(\)]+$/, "Phone number can only contain digits, spaces, +, -, (, )"),
    pin: z
      .string()
      .regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string(),
  })
  .refine((d) => d.pin === d.confirmPin, {
    message: "PINs must match",
    path: ["confirmPin"],
  });

type FormErrors = Partial<Record<"phoneNumber" | "pin" | "confirmPin", string[]>>;

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
  </svg>
);

const inputClass = (hasError: boolean) =>
  `w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${
    hasError ? "border-red-500" : "border-[#1F2E3B]"
  } rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`;

const ErrorMsg = ({ msg }: { msg?: string[] }) =>
  msg?.length ? <p className="text-red-600 text-sm mt-1 ml-1">{msg[0]}</p> : null;

export default function FinishOnboardingParent() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse({ phoneNumber, pin, confirmPin });

    if (!result.success) {
      const fieldErrors = z.flattenError(result.error).fieldErrors;
      setErrors(fieldErrors as FormErrors);
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/parent/setup", {
      method: "PATCH",
      body: JSON.stringify({ phoneNumber, pin }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      alert("Unable to finish account setup. Please try again.");
      return;
    }

    router.push("/profiles");
  }

  return (
    <div className={`${inter.className} w-full min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}>
      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.1)] py-12 px-8">
          <div className="w-full flex flex-col gap-[18px]">
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

            <div className="text-center mb-2">
              <h1 className="text-2xl font-bold text-[#1F2E3B]">
                Finish Setting Up Your Account
              </h1>
              <p className="text-sm text-[#1F2E3B]/60 mt-2">
                Before we get started, let&apos;s complete your account setup.
              </p>
            </div>

            <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
              {/* Phone number */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={inputClass(!!errors.phoneNumber)}
                  />
                </div>
                <ErrorMsg msg={errors.phoneNumber} />
              </div>

              {/* PIN */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showPin ? "text" : "password"}
                    placeholder="Parent access PIN (4 digits)"
                    maxLength={4}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className={inputClass(!!errors.pin)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((p) => !p)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    {showPin ? <EyeOpen /> : <EyeClosed />}
                  </button>
                </div>
                <ErrorMsg msg={errors.pin} />
              </div>

              {/* Confirm PIN */}
              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    placeholder="Confirm PIN"
                    maxLength={4}
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    className={inputClass(!!errors.confirmPin)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin((p) => !p)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                  >
                    {showConfirmPin ? <EyeOpen /> : <EyeClosed />}
                  </button>
                </div>
                <ErrorMsg msg={errors.confirmPin} />
              </div>

              <p className="text-xs text-[#1F2E3B]/50 text-center -mt-2">
                Your PIN will be used to access your parent profile.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-2 bg-[#B1E7D6] rounded-xl text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Complete Setup"}
              </button>
            </form>
          </div>
      </div>
    </div>
  );
}
