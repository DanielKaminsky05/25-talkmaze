"use client";

import { useMemo, useState } from "react";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import AdminCalendar from "../../../../admin/_components/AdminCalendar";
import AvailabilityModal from "./AvailabilityModal";
import SessionDetailsModal from "./SessionDetailsModal";
import SessionsPanel from "./SessionsPanel";
import type { SessionProp, StudentProp } from "./types";

const CALENDAR_HEIGHT = "clamp(520px, calc(100vh - 290px), 610px)";

export type { SessionProp, StudentProp } from "./types";

interface Props {
  students: StudentProp[];
  sessions: SessionProp[];
}

export default function ParentSessionsClient({ students, sessions }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionProp | null>(
    null,
  );

  const filteredSessions = useMemo(() => {
    if (!selectedStudent) return sessions;
    return sessions.filter((session) => session.student_id === selectedStudent);
  }, [sessions, selectedStudent]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      filteredSessions.map((session) => ({
        id: session.id,
        title: session.coachName
          ? `${session.studentName} · ${session.coachName}`
          : session.studentName,
        start: session.start_time,
        end: session.end_time ?? undefined,
        backgroundColor: "#B1E7D6",
        borderColor: "transparent",
        textColor: "#1F2E3B",
      })),
    [filteredSessions],
  );

  const handleEventClick = (arg: EventClickArg) => {
    const matched =
      filteredSessions.find((session) => session.id === arg.event.id) ??
      sessions.find((session) => session.id === arg.event.id) ??
      null;

    if (matched) {
      setSelectedSession(matched);
    }
  };

  return (
    <>
      <div className="flex w-full h-full px-[clamp(12px,1.5vw,24px)] py-[clamp(12px,1.5vw,24px)] overflow-x-hidden">
        <div className="h-full min-h-0 max-w-[1512px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,800px)_clamp(300px,30vw,402px)] gap-[clamp(12px,1.2vw,20px)]">
          {/* Calendar */}
          <section className="min-h-0 min-w-0 flex flex-col items-center self-center">
            <div className="w-full max-w-[800px] bg-white rounded-[20px] p-3 lg:p-4 border border-[#DCE8E5] shadow-[0_8px_20px_rgba(31,46,59,0.08)]">
              <AdminCalendar
                events={calendarEvents}
                initialView="dayGridMonth"
                theme="light"
                height={CALENDAR_HEIGHT}
                onEventClick={handleEventClick}
                dayMaxEventRows
                expandRows
                moreLinkClick="day"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                className="parent-sessions-calendar"
              />
            </div>
          </section>

          <section className="min-h-0 flex flex-col items-end gap-3 self-center">
            <div className="w-full h-[clamp(520px,calc(100vh-290px),760px)]">
              <SessionsPanel
                students={students}
                selectedStudent={selectedStudent}
                onSelectStudent={setSelectedStudent}
                sessions={filteredSessions}
                onShowAllStudents={() => setSelectedStudent(null)}
              />
            </div>

            <button
              onClick={() => setShowAvailability(true)}
              className="px-5 py-2 rounded-lg bg-[#65CFAD] text-[#1F2E3B] text-sm font-semibold hover:bg-[#4fbfa0] transition-colors cursor-pointer"
            >
              Edit Student Availability
            </button>
          </section>
        </div>
      </div>

      {showAvailability && (
        <AvailabilityModal
          students={students}
          initialStudentId={selectedStudent}
          onClose={() => setShowAvailability(false)}
        />
      )}

      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  );
}
