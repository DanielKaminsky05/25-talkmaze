"use client";

import {
  AttendanceMysteryStarIcon,
  AttendedIcon,
  MissedIcon,
} from "@/src/components/ui/icons";
import { Card } from "@/src/components/ui/card";

export type AttendanceStatus = "attended" | "missed" | "cancelled" | "future";

export interface AttendanceItem {
  status: AttendanceStatus;
  session_date?: string;
  coach_name?: string | null;
}

interface StudentAttendanceDetailsProps {
  streak: number;
  attendance: AttendanceItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Displays the selected student's attendance details.
 * Expects up to 12 items (oldest first), padded with "future" for upcoming slots.
 */
export default function StudentAttendanceDetails({
  streak,
  attendance,
}: StudentAttendanceDetailsProps) {
  return (
    <Card
      variant="accent"
      shadow="md"
      className="items-center justify-center h-full"
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
          {attendance.slice(0, 12).map((item, index) => {
            const tooltipLines: string[] = [];
            if (item.session_date) {
              tooltipLines.push(formatDate(item.session_date));
            }
            if (item.coach_name) {
              tooltipLines.push(`Coach: ${item.coach_name}`);
            }
            if (item.status === "future") {
              tooltipLines.push("Upcoming session");
            }
            if (item.status === "cancelled") {
              tooltipLines.push("Cancelled");
            }

            return (
              <div
                key={index}
                className="relative group flex items-center justify-center"
              >
                {item.status === "attended" && <AttendedIcon />}
                {(item.status === "missed" || item.status === "cancelled") && (
                  <MissedIcon />
                )}
                {item.status === "future" && <AttendanceMysteryStarIcon />}

                {tooltipLines.length > 0 && (
                  <div
                    className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2
                      bg-gray-800 text-white text-xs rounded px-2 py-1.5
                      whitespace-nowrap opacity-0 group-hover:opacity-100
                      transition-opacity duration-150 pointer-events-none z-10
                      shadow-md"
                  >
                    {tooltipLines.map((line, i) => (
                      <span
                        key={i}
                        className={`block ${i > 0 ? "text-gray-300 mt-0.5" : ""}`}
                      >
                        {line}
                      </span>
                    ))}
                    {/* Arrow */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
