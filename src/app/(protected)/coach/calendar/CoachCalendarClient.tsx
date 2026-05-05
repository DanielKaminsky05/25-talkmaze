"use client";

import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import Link from "next/link";

interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  student_id: string | null;
  students: { first_name: string | null; last_name: string | null } | null;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

import { fullName } from "@/src/utils/formatName";

function studentName(s: Session["students"]) {
  return fullName(s?.first_name, s?.last_name, "Session");
}

export default function CoachCalendarClient() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [startVal, setStartVal] = useState("");
  const [endVal, setEndVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/coach/sessions");
    const data = await res.json();
    const raw: Session[] = data.sessions ?? [];
    setSessions(raw);
    setEvents(
      raw.map((s) => ({
        id: String(s.id),
        title: studentName(s.students),
        start: s.start_time,
        end: s.end_time ?? undefined,
        backgroundColor: "#2B4257",
        borderColor: "#1a2d3d",
        textColor: "#ffffff",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleEventClick = (arg: EventClickArg) => {
    const session = sessions.find((s) => String(s.id) === arg.event.id);
    if (!session) return;
    setSelected(session);
    setStartVal(toDatetimeLocal(session.start_time));
    setEndVal(session.end_time ? toDatetimeLocal(session.end_time) : "");
    setSaveError("");
  };

  const handleSave = async () => {
    if (!selected || !startVal || !endVal) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/coach/sessions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: new Date(startVal).toISOString(),
          end_time: new Date(endVal).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save");
      } else {
        setSelected(null);
        await loadSessions();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-8 mx-auto">
      <div className="rounded-2xl bg-[#2B4257]/10 border border-[#2B4257]/15 px-6 py-5 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2B4257]">My Calendar</h1>
          <p className="mt-1 text-sm text-[#2B4257]/70">
            View upcoming sessions. Click any session to reschedule it.
          </p>
        </div>
        <Link
          href="/coach"
          className="text-sm font-medium text-[#2B4257] border border-[#2B4257]/30 rounded-lg px-4 py-2 hover:bg-[#2B4257]/10 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm p-6">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center text-[#2B4257]/40 text-sm">
            Loading sessions…
          </div>
        ) : (
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
            height="calc(100vh - 260px)"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            scrollTime="07:00:00"
            scrollTimeReset={false}
            allDaySlot={false}
            nowIndicator
          />
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[#2B4257] mb-1">Reschedule Session</h2>
            <p className="text-sm text-[#2B4257]/50 mb-6">{studentName(selected.students)}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2B4257] mb-1">
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                  className="w-full border border-[#2B4257]/20 rounded-lg px-3 py-2 text-sm text-[#2B4257] focus:outline-none focus:ring-2 focus:ring-[#2B4257]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B4257] mb-1">
                  End
                </label>
                <input
                  type="datetime-local"
                  value={endVal}
                  onChange={(e) => setEndVal(e.target.value)}
                  className="w-full border border-[#2B4257]/20 rounded-lg px-3 py-2 text-sm text-[#2B4257] focus:outline-none focus:ring-2 focus:ring-[#2B4257]/30"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-red-500 text-sm mt-3">{saveError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2 rounded-lg border border-[#2B4257]/20 text-sm text-[#2B4257] hover:bg-[#2B4257]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-[#2B4257] text-sm text-white font-medium hover:bg-[#2B4257]/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
