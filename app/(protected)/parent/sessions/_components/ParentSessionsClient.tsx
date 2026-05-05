"use client";

import { useMemo, useState } from "react";
import Calendar from "./Calendar";
import { CalendarDays, ChevronDown, User } from "lucide-react";
import AvailabilityModal from "./AvailabilityModal";

// ─── Types (exported so page.tsx can import them) ─────────────────────────────

export interface StudentProp {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface SessionProp {
  id: string;
  start_time: string;
  end_time: string;
  student_id: string;
  studentName: string;
  coachName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Session card — matches UpcomingLessonsList card style ────────────────────

function SessionCard({ session }: { session: SessionProp }) {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <div className="w-full min-h-[72px] p-4 border-[0.5px] rounded-xl font-semibold border-[#4E4C4C] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex justify-between items-center bg-white text-[#2B4257]">
      <div>
        <p>{formatDate(session.start_time)}</p>
        <p className="text-sm font-normal text-[#4E4C4C] mt-0.5">
          {session.studentName}
          {session.coachName && (
            <span className="text-[#2B4257]"> · with {session.coachName}</span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p>{formatTime(session.start_time)}</p>
        <p className="text-xs font-normal text-[#4E4C4C]">{durationMin} min</p>
      </div>
    </div>
  );
}

// ─── Student filter dropdown ──────────────────────────────────────────────────

function StudentFilter({
  students,
  selected,
  onChange,
}: {
  students: StudentProp[];
  selected: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedStudent_ = selected ? students.find((s) => s.id === selected) : null;
  const label = selectedStudent_
    ? [selectedStudent_.first_name, selectedStudent_.last_name].filter(Boolean).join(" ") || "Student"
    : "All Students";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-[#1F2E3B] border border-[#2B4257] hover:border-[#65CFAD] text-white text-sm px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
      >
        <User size={13} className="text-[#65CFAD]" />
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={`text-[#65CFAD] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-20 bg-[#1F2E3B] border border-[#2B4257] rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${selected === null
              ? "bg-[#65CFAD]/20 text-[#65CFAD] font-semibold"
              : "text-white hover:bg-[#142535]"
              }`}
          >
            All Students
          </button>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${selected === s.id
                ? "bg-[#65CFAD]/20 text-[#65CFAD] font-semibold"
                : "text-white hover:bg-[#142535]"
                }`}
            >
              {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Student"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Client component ─────────────────────────────────────────────────────────

interface Props {
  students: StudentProp[];
  sessions: SessionProp[];
}

export default function ParentSessionsClient({ students, sessions }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!selectedStudent) return sessions;
    return sessions.filter((s) => s.student_id === selectedStudent);
  }, [sessions, selectedStudent]);

  // ISO strings for all visible sessions so Calendar can render dots
  const sessionDates = useMemo(
    () => filteredSessions.map((s) => s.start_time),
    [filteredSessions],
  );

  return (
    <>
      <div className="flex h-full mr-10 mb-6 bg-[#1F2E3B] shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] rounded-xl">
        <div className="w-full mt-[106px] ml-6 flex justify-evenly">
          {/* ── Calendar ── */}
          <div className="w-[668px]">
            <Calendar sessionDates={sessionDates} />
          </div>

          {/* ── Right column: sessions panel + edit availability ── */}
          <div className="flex flex-col items-end gap-3">
            {/* Sessions panel */}
            <div className="w-[402px] h-[592px] p-5 rounded-[20px] bg-[#B1E7D6] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-[#1F2E3B] font-semibold">
                  Upcoming Sessions
                </h1>

                {students.length > 1 && (
                  <StudentFilter
                    students={students}
                    selected={selectedStudent}
                    onChange={setSelectedStudent}
                  />
                )}
              </div>

              {/* Session list */}
              <div className="w-full flex flex-1 flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                    <CalendarDays size={32} className="text-[#2B4257]/40" />
                    <p className="text-[#2B4257] text-sm font-medium">
                      No upcoming sessions
                    </p>
                    {selectedStudent && (
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-[#1F2E3B] text-xs underline cursor-pointer mt-1"
                      >
                        Show all students
                      </button>
                    )}
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))
                )}
              </div>

              {/* Session count */}
              {filteredSessions.length > 0 && (
                <p className="text-xs text-[#2B4257] text-right mt-3">
                  {filteredSessions.length} session
                  {filteredSessions.length !== 1 ? "s" : ""} scheduled
                </p>
              )}
            </div>

            {/* Edit Availability — below the panel, right-aligned */}
            <button
              onClick={() => setShowAvailability(true)}
              className="px-5 py-2 rounded-xl bg-[#65CFAD] text-[#1F2E3B] text-sm font-semibold hover:bg-[#4fbfa0] transition-colors cursor-pointer"
            >
              Edit Availability
            </button>
          </div>
        </div>
      </div>

      {showAvailability && (
        <AvailabilityModal
          students={students}
          initialStudentId={selectedStudent}
          onClose={() => setShowAvailability(false)}
        />
      )}
    </>
  );
}
