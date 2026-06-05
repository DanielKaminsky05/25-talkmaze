"use client";

import { useMemo, useState } from "react";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import AdminCalendar from "../../../../admin/_components/AdminCalendar";
import AvailabilityModal from "./AvailabilityModal";
import SessionDetailsModal from "./SessionDetailsModal";
import SessionsPanel from "./SessionsPanel";
import type { SessionProp, StudentProp } from "./types";
import { Button } from "@/src/components/ui/button";

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
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const filteredSessions = useMemo(() => {
    if (!selectedStudent) return sessions;
    return sessions.filter((session) => session.student_id === selectedStudent);
  }, [sessions, selectedStudent]);

  const handleSelectStudent = (id: string | null) => {
    setSelectedStudent(id);
    setSelectedSessionId(null);
  };

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
      setModalMode("view");
      setSelectedSession(matched);
    }
  };

  const handleReschedule = () => {
    const session = filteredSessions.find((s) => s.id === selectedSessionId);
    if (!session) return;
    setModalMode(session.reschedule_status === "pending" ? "view" : "edit");
    setSelectedSession(session);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    setModalMode("view");
  };

  return (
    <>
      <div className="flex w-full h-full px-[clamp(12px,1.5vw,24px)] py-[clamp(12px,1.5vw,24px)] overflow-x-hidden overflow-y-auto">
        <div className="w-full lg:h-full min-h-0 max-w-[1512px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,800px)_clamp(300px,30vw,402px)] lg:grid-rows-[1fr] gap-[clamp(12px,1.2vw,20px)] justify-center">
          {/* Calendar */}
          <section className="min-h-0 min-w-0 flex flex-col items-center lg:self-center">
            <div className="w-full max-w-[800px] bg-white rounded-[20px] p-3 lg:p-4 border border-[#DCE8E5] shadow-[0_8px_20px_rgba(31,46,59,0.08)] overflow-x-auto">
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

          <section className="min-h-0 flex flex-col items-stretch lg:items-end gap-3 lg:self-center">
            <div className="w-full h-[400px] lg:h-[clamp(520px,calc(100vh-290px),760px)]">
              <SessionsPanel
                students={students}
                selectedStudent={selectedStudent}
                onSelectStudent={handleSelectStudent}
                sessions={filteredSessions}
                onShowAllStudents={() => handleSelectStudent(null)}
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
                onReschedule={handleReschedule}
              />
            </div>

            <Button variant="default" size="md" onClick={() => setShowAvailability(true)}>
              Edit Student Availability
            </Button>
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
          onClose={handleCloseModal}
          initialMode={modalMode}
        />
      )}
    </>
  );
}
