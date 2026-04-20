"use client";

import { EditIcon, LocationPinFilledIcon } from "@/app/(protected)/components/ui/icons";

interface StudentProfileCardProps {
  name: string;
  location: string;
  dob: string;
  grade: string | number;
  description: string;
  imageUrl?: string;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalStudents?: number;
}

/**
 * Displays the profile details (notes, DOB, etc.) of the selected student
 */
export default function StudentProfileCard({
  name = "Priya",
  location = "Location",
  dob = "April 11, 2016",
  grade = "3",
  description = "Sweet and outgoing personality",
  imageUrl = "https://placehold.co/120x120",
  onNext,
  onPrev,
  currentIndex = 0,
  totalStudents = 1,
}: StudentProfileCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-[0_4px_4px_rgba(0,0,0,0.25)] relative"
      style={{
        height: "100%",
        backgroundColor: "#B1E7D6",
        backgroundImage: "url('/student-profile-card-bg.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Green header bar */}
      <div className="bg-[#65CFAD] h-[51px] w-full flex items-center justify-between px-4 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-baseline gap-3">
          <h2
            className="font-bold text-[#1F2E3B] text-[22px] leading-none"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            TalkMaze Student {totalStudents > 1 ? "Profiles" : "Profile"}
          </h2>
          {totalStudents > 1 && (
            <div className="flex items-center gap-1.5 bg-[#1F2E3B]/10 px-2 py-1 rounded-full">
              <button
                onClick={onPrev}
                className="w-5 h-5 rounded-full bg-[#1F2E3B] text-white flex items-center justify-center hover:bg-[#2B4257] transition-all active:scale-95"
              >
                <ChevronLeftIcon />
              </button>
              <span className="text-[11px] font-bold text-[#1F2E3B] leading-none -mb-px">
                {currentIndex + 1} / {totalStudents}
              </span>
              <button
                onClick={onNext}
                className="w-5 h-5 rounded-full bg-[#1F2E3B] text-white flex items-center justify-center hover:bg-[#2B4257] transition-all active:scale-95"
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}
        </div>
        <button
          className="bg-[#1F2E3B] text-white text-[10px] font-semibold px-3 py-1 rounded flex items-center gap-1"
          style={{ borderRadius: "5px" }}
        >
          <EditIcon />
          EDIT
        </button>
      </div>

      {/* Avatar — overlaps header */}
      <div
        className="absolute left-6 top-[51px] z-20 flex flex-col items-center"
        style={{ top: "74px" }}
      >
        <div className="w-[153px] h-[153px] overflow-hidden rounded-full">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <p
          className="text-[#2E2E2E] font-semibold text-[20px] mt-1 whitespace-nowrap"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          {name}
        </p>
      </div>

      {/* Right info section */}
      <div className="absolute left-[197px] right-4 top-[51px] bottom-4 flex flex-col">
        {/* Location */}
        <div className="flex items-center gap-1 my-1">
          <LocationPinFilledIcon />
          <span
            className="text-[#2B4257] font-semibold text-[12px]"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {location}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#1F2E3B]/20 w-full" />

        {/* Date of Birth / Grade */}
        <div className="flex my-2 pl-4 gap-7">
          <div
            className="flex flex-col gap-1 text-black/40 font-semibold text-[16px]"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            <span>Date of Birth</span>
            <span>Grade</span>
          </div>
          <div
            className="flex flex-col gap-1 text-[#1F2E3B] font-semibold text-[16px]"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            <span>{dob}</span>
            <span>{grade}</span>
          </div>
        </div>

        {/* Personality bio box */}
        <div
          className="bg-white rounded-xl p-3 text-[#1F2E3B] text-[14px] italic leading-snug shadow-[inset_0_3px_3.3px_rgba(0,0,0,0.25)] flex-1"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
      <path
        d="M5 1L1 5L5 9"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
      <path
        d="M1 1L5 5L1 9"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
