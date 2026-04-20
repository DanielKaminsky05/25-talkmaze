"use client";

import {
  AttendanceMysteryStarIcon,
  AttendedIcon,
  MissedIcon,
} from "@/app/(protected)/components/ui/icons";

type AttendanceStatus = "attended" | "missed" | "future";

interface AttendanceItem {
  status: AttendanceStatus;
}

interface StudentAttendanceDetailsProps {
  streak?: number;
  studentId?: string;
  attendance?: AttendanceItem[];
}

const defaultAttendance: AttendanceItem[] = [
  { status: "attended" },
  { status: "missed" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "attended" },
  { status: "future" },
  { status: "future" },
];

/**
 * Displays the selected student's attendance details.
 */
export default function StudentAttendanceDetails({
  streak = 8,
  attendance = defaultAttendance,
}: StudentAttendanceDetailsProps) {
  return (
    <div
      className="bg-[#B1E7D6] rounded-2xl shadow-[0_4px_4px_rgba(0,0,0,0.25)]
      p-6 flex items-center justify-center h-full"
    >
      <div className="flex flex-col gap-4 items-start px-6 w-full">
        {/* Streak number */}
        <div className="flex flex-col leading-none">
          <span
            className="font-bold text-[32px] text-[#1F2E3B] leading-none"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {streak}
          </span>
          <span
            className="font-normal text-[16px] text-[#2B4257]"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            attendance streak
          </span>
        </div>

        {/* Icon grid: 2 rows × 6 cols */}
        <div className="grid grid-cols-6 w-full place-items-center">
          {attendance.slice(0, 12).map((item, index) => (
            <div key={index}>
              {item.status === "attended" && <AttendedIcon />}
              {item.status === "missed" && <MissedIcon />}
              {item.status === "future" && <AttendanceMysteryStarIcon />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
