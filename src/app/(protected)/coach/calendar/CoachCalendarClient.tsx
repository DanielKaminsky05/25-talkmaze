"use client";

import { useEffect, useState, useCallback } from "react";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import AdminCalendar from "../../admin/_components/AdminCalendar";

interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  student_id: string | null;
  students: { first_name: string | null; last_name: string | null } | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reschedule_status: "pending" | null;
}

const SESSION_MINT = "#B1E7D6";
const SESSION_AMBER = "#FCD34D";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [decisionLoading, setDecisionLoading] = useState<
    "approve" | "decline" | null
  >(null);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);
  // §4 — calendar defaults to day view below md (week/month don't fit).
  const [isBelowMd, setIsBelowMd] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsBelowMd(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsBelowMd(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/coach/sessions");
    const data = await res.json();
    const raw: Session[] = data.sessions ?? [];
    setSessions(raw);
    setEvents(
      raw.map((s) => {
        const isPending = s.reschedule_status === "pending";
        return {
          id: String(s.id),
          title: isPending
            ? `↻ ${studentName(s.students)}`
            : studentName(s.students),
          start: s.start_time,
          end: s.end_time ?? undefined,
          backgroundColor: isPending ? SESSION_AMBER : SESSION_MINT,
          borderColor: "transparent",
          textColor: "#1F2E3B",
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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

  const handleDecision = async (decision: "approve" | "decline") => {
    if (!selected) return;
    setDecisionLoading(decision);
    setSaveError("");
    try {
      const res = await fetch(
        `/api/coach/sessions/${selected.id}/reschedule-request/${decision}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? `Failed to ${decision}`);
      } else {
        setSelected(null);
        await loadSessions();
      }
    } finally {
      setDecisionLoading(null);
    }
  };

  const isPending = selected?.reschedule_status === "pending";
  const busy = saving || decisionLoading !== null;

  return (
    <div className="w-full h-full p-4 md:p-6 mx-auto">
      <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
        <AdminCalendar
          events={events}
          initialView={isBelowMd ? "timeGridDay" : "dayGridMonth"}
          loading={loading}
          offsetPx={250}
          onEventClick={handleEventClick}
          dayMaxEventRows
          expandRows
          moreLinkClick="day"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
        />
      </div>

      {/* Reschedule Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#2B4257] mb-1">
              {isPending ? "Reschedule Request" : "Reschedule Session"}
            </h2>
            <p className="text-sm text-[#2B4257]/50 mb-6">
              {studentName(selected.students)}
            </p>

            {isPending &&
              selected.requested_start_time &&
              selected.requested_end_time && (
                <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                  <p className="text-xs uppercase tracking-wide font-semibold text-amber-800 mb-2">
                    Parent requested
                  </p>
                  <div className="space-y-1 text-amber-900">
                    <div className="flex justify-between gap-3">
                      <span className="text-amber-900/70">Start</span>
                      <span className="font-medium text-right">
                        {formatDateTime(selected.requested_start_time)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-amber-900/70">End</span>
                      <span className="font-medium text-right">
                        {formatDateTime(selected.requested_end_time)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2B4257] mb-1">
                  {isPending ? "Current start" : "Start"}
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
                  {isPending ? "Current end" : "End"}
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

            {isPending ? (
              <div className="mt-6 space-y-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision("decline")}
                    disabled={busy}
                    className="flex-1 min-h-11 py-2 rounded-lg border border-[#2B4257]/20 text-sm text-[#2B4257] font-medium hover:bg-[#2B4257]/5 disabled:opacity-50 transition-colors"
                  >
                    {decisionLoading === "decline" ? "Declining…" : "Decline"}
                  </button>
                  <button
                    onClick={() => handleDecision("approve")}
                    disabled={busy}
                    className="flex-1 min-h-11 py-2 rounded-lg bg-[#65CFAD] text-sm text-[#1F2E3B] font-semibold hover:bg-[#50bfa0] disabled:opacity-50 transition-colors"
                  >
                    {decisionLoading === "approve" ? "Approving…" : "Approve"}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    disabled={busy}
                    className="flex-1 min-h-11 py-2 rounded-lg border border-[#2B4257]/20 text-xs text-[#2B4257]/70 hover:bg-[#2B4257]/5 disabled:opacity-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={busy}
                    className="flex-1 min-h-11 py-2 rounded-lg bg-[#2B4257] text-xs text-white font-medium hover:bg-[#2B4257]/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : "Save Current Times Instead"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelected(null)}
                  disabled={busy}
                  className="flex-1 min-h-11 py-2 rounded-lg border border-[#2B4257]/20 text-sm text-[#2B4257] hover:bg-[#2B4257]/5 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy}
                  className="flex-1 min-h-11 py-2 rounded-lg bg-[#2B4257] text-sm text-white font-medium hover:bg-[#2B4257]/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
