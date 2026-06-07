"use client";

import { useState } from "react";
import Image from "next/image";
import { Inter } from "next/font/google";
import { z } from "zod";
import { EyeIcon } from "@/src/components/ui/icons";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { completeNewUserSetup } from "./actions";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const schema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string(),
  })
  .refine((d) => d.pin === d.confirmPin, {
    message: "PINs must match",
    path: ["confirmPin"],
  });

type FormErrors = Partial<Record<"pin" | "confirmPin", string[]>>;


const ErrorMsg = ({ msg }: { msg?: string[] }) =>
  msg?.length ? (
    <p className="text-red-600 text-sm mt-1 ml-1">{msg[0]}</p>
  ) : null;

export default function NewUserSetupPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = schema.safeParse({ pin, confirmPin });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(fieldErrors as FormErrors);
      return;
    }

    setIsSubmitting(true);
    const response = await completeNewUserSetup(pin);
    setIsSubmitting(false);

    if (response && !response.success) {
      setServerError(response.message ?? "Something went wrong.");
    }
  }

  return (
    <div
      className={`${inter.className} w-full min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.1)] py-12 px-8">
        <div className="w-full flex flex-col gap-[18px]">
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

          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-[#1F2E3B]">
              Set Your Parent PIN
            </h1>
            <p className="text-sm text-[#1F2E3B]/60 mt-2">
              Create a 4-digit PIN to access your parent profile.
            </p>
          </div>

          <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
            {/* PIN */}
            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!errors.pin}
                  type={showPin ? "text" : "password"}
                  placeholder="Parent access PIN (4 digits)"
                  maxLength={4}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
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
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!errors.confirmPin}
                  type={showConfirmPin ? "text" : "password"}
                  placeholder="Confirm PIN"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, ""))
                  }
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

            {serverError && (
              <p className="text-red-600 text-sm text-center">{serverError}</p>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 text-[20px]"
            >
              {isSubmitting ? "Saving..." : "Set PIN"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
