"use client";

import type { AttendanceStatus } from "../StudentDetails";
import { fmtUtcDate, fmtUtcTime } from "@/src/utils/formatDateTime";

const STATUS_BUTTONS: {
  status: AttendanceStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    status: "attended",
    label: "Attended",
    activeClass: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    status: "missed",
    label: "Missed",
    activeClass: "bg-red-500 text-white border-red-500",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    activeClass: "bg-gray-400 text-white border-gray-400",
  },
];

const STATUS_DOT: Record<AttendanceStatus, string> = {
  attended: "bg-emerald-500",
  missed: "bg-red-400",
  cancelled: "bg-gray-400",
};

interface Session {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface StudentScheduleProps {
  sessions: Session[];
  loading: boolean;
  attendanceBySessionId?: Record<number, AttendanceStatus>;
  onMarkAttendance?: (session: Session, status: AttendanceStatus) => void;
  submittingSessionId?: number | null;
}

export default function StudentSchedule({
  sessions,
  loading,
  attendanceBySessionId = {},
  onMarkAttendance,
  submittingSessionId,
}: StudentScheduleProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-400">No upcoming sessions scheduled.</p>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const currentStatus = attendanceBySessionId[s.id];
        const isSubmitting = submittingSessionId === s.id;

        return (
          <div
            key={s.id}
            className="bg-white border border-[#2B4257]/10 rounded-lg px-3 py-2.5 text-xs shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-[#2B4257]/70 shrink-0">
                  {fmtUtcDate(s.start_time)}
                </span>
                <span className="text-gray-500 shrink-0">
                  {fmtUtcTime(s.start_time)} – {fmtUtcTime(s.end_time)}
                </span>
              </div>
              {currentStatus && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[currentStatus]}`}
                />
              )}
            </div>

            {onMarkAttendance && (
              <div className="mt-2.5 flex gap-1.5 flex-wrap">
                {STATUS_BUTTONS.map(({ status, label, activeClass }) => (
                  <button
                    key={status}
                    disabled={isSubmitting}
                    onClick={() => onMarkAttendance(s, status)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors disabled:opacity-60 ${
                      currentStatus === status
                        ? activeClass
                        : "border-[#2B4257]/20 text-gray-500 hover:border-[#2B4257]/40 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
