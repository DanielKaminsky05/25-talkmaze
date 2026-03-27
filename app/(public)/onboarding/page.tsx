"use client";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingCalendar from "../../(protected)/components/onboardingCalendar/OnboardingCalendar";
import { handleStudentCreation } from "./actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const onBoardSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().min(1),
  birthDate: z.string().min(1),
  grade: z.number().int().min(1).max(12),
  school: z.string().min(1),
  timeZone: z.string().min(1),
  mobilePhone: z.string().min(1),
  notes: z.string(),
  availability: z.array(z.date()),
});

const TIME_ZONES = [
  "America/St_Johns",     // Newfoundland
  "America/Halifax",      // Atlantic
  "America/Toronto",      // Eastern (Canada)
  "America/New_York",     // Eastern (US)
  "America/Chicago",      // Central
  "America/Winnipeg",     // Central (Canada)
  "America/Denver",       // Mountain
  "America/Edmonton",     // Mountain (Canada)
  "America/Phoenix",      // Mountain (no DST)
  "America/Los_Angeles",  // Pacific
  "America/Vancouver",    // Pacific (Canada)
  "America/Anchorage",    // Alaska
  "Pacific/Honolulu"      // Hawaii
];

 export type time_zone =  "America/Toronto"|
  "America/St_Johns"|    // Newfoundland
  "America/Halifax"|     // Atlantic
  "America/Toronto"|     // Eastern (Canada)
  "America/New_York"|     // Eastern (US)
  "America/Chicago"|     // Central
  "America/Winnipeg"|     // Central (Canada)
  "America/Denver"  |    // Mountain
  "America/Edmonton"|    // Mountain (Canada)
  "America/Phoenix"|     // Mountain (no DST)
  "America/Los_Angeles"|  // Pacific
  "America/Vancouver"|    // Pacific (Canada)
  "America/Anchorage"|    // Alaska
  "Pacific/Honolulu";   // Hawaii

export default function Onboarding() {
  const router = useRouter();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [grade, setGrade] = useState<number>(-1);
  const [school, setSchool] = useState<string>("");
  const [timeZone, setTimeZone] = useState<time_zone>("America/Toronto");
  const[homePhone, setHomePhone] = useState<string>("");
  const [mobilePhone, setMobilePhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [availability, setAvailability] = useState<Date[]>([]);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const[email,setEmail] = useState<string>("");
  const[pin, setPin] = useState<string>("");
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try{
      //get response
      
      const response = handleStudentCreation(firstName, lastName,email,birthDate,homePhone,mobilePhone,school,grade,notes,timeZone,pin);
    }catch(err){
      console.log(err);
    }
  }

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
          style={{ borderRadius: "12px" }}
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

               <div className="flex flex-col gap-1">
                <p className="text-[#A8A8A8]">Please enter your email for lesson notifications: </p>
                <div className="relative h-[58px]">
                  <input
                    type="text"
                    placeholder="Email"
                    value={email}
                    className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    onChange={(e) => setEmail(e.target.value)}
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

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please enter your birthday.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] border-[0.7px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please select your grade.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <select
                      value={grade ?? ""}
                      onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : -1)}
                      className={`w-full h-full px-5 text-[20px] border-[0.7px] bg-white appearance-none cursor-pointer ${
                        !grade ? "text-[#1F2E3B]/60" : "text-[#1F2E3B]"
                      }`}
                    >
                      <option value="" disabled hidden>
                        Grade
                      </option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
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

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please enter your school.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="School"
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please select your time zone.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value as time_zone)}
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] border-[0.7px] bg-white appearance-none cursor-pointer"
                    >
                      {TIME_ZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
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

              <div className="mt-3">
                <p className="text-[#A8A8A8]">Please enter your home phone.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="tel"
                      value={homePhone}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        setHomePhone(digitsOnly);
                      }}
                      placeholder="Mobile Phone"
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    />
                  </div>
                </div>
              </div>

               <div className="mt-3">
                <p className="text-[#A8A8A8]">Please enter your mobile phone.</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="relative h-[58px]">
                    <input
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        setMobilePhone(digitsOnly);
                      }}
                      placeholder="Mobile Phone"
                      className="w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px]"
                    />
                  </div>
                </div>
              </div>


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
                    className={`w-5 h-5 text-[#1F2E3B]/60 transition-transform duration-200 ${
                      showCalendar ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCalendar && (
                  <>
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
              
              <div className="flex flex-col gap-2 w-full max-w-[260px]">
                    <label className="text-black text-sm font-semibold">
                      Account PIN Number (Do Not Share!)
                    </label>

                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.currentTarget.value.replace(/\D/g, "").slice(0, 4);
                        setPin(value);
                      }}
                      placeholder="••••"
                      className="w-full h-[44px] px-3 rounded-lg bg-[#1f2e3b] border border-[#4e4c4c] text-white text-center tracking-[0.3em] outline-none focus:border-[#65cfad] focus:ring-1 focus:ring-[#65cfad] transition"
                    />
              </div>
              <div className="mt-3">
                <p className="text-[#A8A8A8]">Any additional notes?</p>
                <div className="flex flex-col gap-1">
                  <div className="relative h-[150px] w-[400px]">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes..."
                      className="w-full h-full px-5 py-4 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] resize-none"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-1/2 mx-auto h-[38px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
                onClick={() => router.push("/profiles")}
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