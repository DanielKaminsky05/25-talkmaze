"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Inter } from "next/font/google";
import { z } from "zod";
import { EyeIcon } from "@/src/components/ui/icons";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const schema = z
  .object({
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Please enter a valid phone number")
      .regex(
        /^[\d\s\+\-\(\)]+$/,
        "Phone number can only contain digits, spaces, +, -, (, )",
      ),
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string(),
  })
  .refine((d) => d.pin === d.confirmPin, {
    message: "PINs must match",
    path: ["confirmPin"],
  });

type FormErrors = Partial<
  Record<"phoneNumber" | "pin" | "confirmPin", string[]>
>;

const inputClass = (hasError: boolean) =>
  `w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${
    hasError ? "border-red-500" : "border-[#1F2E3B]"
  } rounded-[10px] focus:outline-none focus:border-[#65CFAD] focus:ring-1 focus:ring-[#65CFAD] transition-colors`;

const ErrorMsg = ({ msg }: { msg?: string[] }) =>
  msg?.length ? (
    <p className="text-red-600 text-sm mt-1 ml-1">{msg[0]}</p>
  ) : null;

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
    <div
      className={`${inter.className} w-full min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
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
                  <EyeIcon variant={showPin ? "open" : "closed"} />
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
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, ""))
                  }
                  className={inputClass(!!errors.confirmPin)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin((p) => !p)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1F2E3B] hover:text-[#65CFAD] transition-colors"
                >
                  <EyeIcon variant={showConfirmPin ? "open" : "closed"} />
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
