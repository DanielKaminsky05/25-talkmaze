"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function FinishOnboardingParent() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [pin, setPin] = useState<string>("");

  const router = useRouter();
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const response = await fetch("/api/parent/setup", {
      method: "PATCH",
      body: JSON.stringify({
        phoneNumber,
        pin,
      }),
    });

    if (!response.ok) {
      alert("Unable to finish parent onboarding");
    }

    if (response.ok) {
      router.push("/profiles");
    }
  }
  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-[#2b4257] px-4">
      <div className="w-full max-w-md bg-[#b1e7d6] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.25)] p-8">
        <h1 className="text-2xl font-bold text-[#2b4257] mb-6 text-center">
          Finish Setting Up Your Account
        </h1>

        <p className="text-sm text-[#2b4257] mb-6 text-center opacity-80">
          Before we get started, let's complete your account setup.
        </p>

        <form className="flex flex-col gap-4" onSubmit={(e) => handleSubmit(e)}>
          <input
            value={phoneNumber}
            type="tel"
            placeholder="Phone number"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#65CFAD]"
            required
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <input
            type="password"
            placeholder="Parent access PIN"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]{4}"
            value={pin}
            onChange={(e) => {
              // allow only digits
              const value = e.target.value.replace(/\D/g, "");
              setPin(value);
            }}
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#65CFAD]"
            required
          />

          <button
            type="submit"
            className="mt-4 bg-[#2b4257] text-white font-bold py-3 rounded-full hover:bg-[#1f2e3b] transition"
          >
            Complete Setup
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-[#2b4257] opacity-70">
          Your PIN will be used to access your parent profile.
        </div>
      </div>
    </div>
  );
}
