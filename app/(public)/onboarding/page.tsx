"use client";
import {z} from 'zod';
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingCalendar from '../../(protected)/components/onboardingCalendar/OnboardingCalendar';
import { handleStudentCreation } from './actions';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const onBoardSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  grade: z.number().int().min(1).max(12),
  notes: z.string(),
  availability: z.array(z.date()),
})

export default function Onboarding(){

 
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [grade, setGrade] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>("");
  const [availability, setAvailability] = useState<Date[]>([]);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleStudentCreation(firstName, lastName,new Date());
  }

  // Receives selected dates from Calendar and toggles them in availability[]
  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    setAvailability((prev) => {
      const alreadySelected = prev.some(
        (d) =>
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === date.getDate()
      );
      if (alreadySelected) {
        return prev.filter(
          (d) =>
            !(
              d.getFullYear() === date.getFullYear() &&
              d.getMonth() === date.getMonth() &&
              d.getDate() === date.getDate()
            )
        );
      }
      return [...prev, date];
    });
  };

  return (
    <div className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}>
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        <div
          className="w-full lg:w-[1229px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px 12px 12px 12px" }}
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

            <form className="flex flex-col gap-[14px]" onSubmit={handleSubmit}>
              <div>
                <p className="text-[#A8A8A8]">Please enter your full name.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please enter your address.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    />
                  </div>
                </div>
              </div>

              {/* Grade dropdown section */}
              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please select your grade.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <select
                      value={grade ?? ""}
                      onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full h-full px-5 text-[20px] border-[0.7px] bg-white appearance-none cursor-pointer
                        ${!grade ? "text-[#1F2E3B]/60" : "text-[#1F2E3B]"}`}
                    >
                      <option value="" disabled hidden>Grade</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <svg className="w-5 h-5 text-[#1F2E3B]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Availability Calendar section */}
<div className="mt-3">
  <p className="text-[#A8A8A8]">Please select your availability.</p>
  
  <button
    type="button"
    onClick={() => setShowCalendar((prev) => !prev)}
    className="mt-2 w-full h-[58px] px-5 text-[20px] text-[#1F2E3B] border-[0.7px] bg-white flex items-center justify-between"
  >
    <span className={availability.length === 0 ? "text-[#1F2E3B]/60" : "text-[#1F2E3B]"}>
      {availability.length === 0
        ? "Select dates..."
        : `${availability.length} date${availability.length > 1 ? "s" : ""} selected`}
    </span>
    <svg
      className={`w-5 h-5 text-[#1F2E3B]/60 transition-transform duration-200 ${showCalendar ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showCalendar && (
    <>
      {/* Selected dates summary */}
      {availability.length > 0 && (
        <div className="mt-2 mb-3 flex flex-wrap gap-2">
          {availability
            .sort((a, b) => a.getTime() - b.getTime())
            .map((date) => {
              const label = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <span
                  key={date.toISOString()}
                  className="flex items-center gap-1 px-3 py-1 bg-[#B1E7D6] text-[#1F2E3B] text-[14px] font-semibold rounded-full"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    className="ml-1 text-[#1F2E3B]/60 hover:text-[#1F2E3B] leading-none"
                  >
                    ×
                  </button>
                </span>
              );
            })}
        </div>
      )}
      <div className="mt-2 w-full">
        <OnboardingCalendar selectedDates={availability} onDateSelect={handleDateSelect} />
      </div>
    </>
  )}
</div>

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Any additional notes?</p>
                <div className="flex flex-col gap-1">
                  <div className="relative h-[150px] w-[400px]">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes..."
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-1/2 mx-auto h-[38px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
              >
                Submit
              </button>

              <div className="text-center mt-2">
                <p className="text-[#1F2E3B]">
                  <Link href="/signup" className="font-bold hover:underline">
                    exit
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}