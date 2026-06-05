import { CalendarDays } from "lucide-react";
import type { SessionProp, StudentProp } from "./types";
import { Button } from "@/src/components/ui/button";
import SessionCard from "./SessionCard";
import StudentFilter from "./StudentFilter";

interface Props {
  students: StudentProp[];
  selectedStudent: string | null;
  onSelectStudent: (id: string | null) => void;
  sessions: SessionProp[];
  onShowAllStudents: () => void;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onReschedule: () => void;
}

export default function SessionsPanel({
  students,
  selectedStudent,
  onSelectStudent,
  sessions,
  onShowAllStudents,
  selectedSessionId,
  onSelectSession,
  onReschedule,
}: Props) {
  const hasSelection = selectedSessionId !== null;

  return (
    <div className="w-full h-full min-h-0 p-3.5 xl:p-5 rounded-[20px] bg-[#B1E7D6] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 xl:mb-4">
        <h1 className="text-[#1F2E3B] font-semibold">Upcoming Sessions</h1>

        {students.length > 1 && (
          <StudentFilter
            students={students}
            selected={selectedStudent}
            onChange={onSelectStudent}
          />
        )}
      </div>

      <div className="w-full flex flex-1 flex-col gap-2.5 xl:gap-3 overflow-y-auto pr-1 no-scrollbar">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <CalendarDays size={32} className="text-[#2B4257]/40" />
            <p className="text-[#2B4257] text-sm font-medium">
              No upcoming sessions
            </p>
            {selectedStudent && (
              <button
                onClick={onShowAllStudents}
                className="text-[#1F2E3B] text-xs underline cursor-pointer mt-1"
              >
                Show all students
              </button>
            )}
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              selected={session.id === selectedSessionId}
              onSelect={onSelectSession}
            />
          ))
        )}
      </div>

      {sessions.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#2B4257]">
            {sessions.length} session
            {sessions.length !== 1 ? "s" : ""} scheduled
          </p>
          <Button variant="secondary" size="md" onClick={onReschedule} disabled={!hasSelection}>
            Reschedule
          </Button>
        </div>
      )}
    </div>
  );
}
