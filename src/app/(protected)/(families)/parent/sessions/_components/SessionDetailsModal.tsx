"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { SessionProp } from "./types";
import { formatDateTime, getDurationMin } from "./sessionDateUtils";

interface Props {
  session: SessionProp;
  onClose: () => void;
  initialMode?: Mode;
}

type Mode = "view" | "edit";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionDetailsModal({
  session,
  onClose,
  initialMode = "view",
}: Props) {
  const router = useRouter();
  const durationMin = getDurationMin(session.start_time, session.end_time);
  const isPending = session.reschedule_status === "pending";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [startVal, setStartVal] = useState(toDatetimeLocal(session.start_time));
  const [endVal, setEndVal] = useState(
    session.end_time ? toDatetimeLocal(session.end_time) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitRequest = async () => {
    if (!startVal || !endVal) {
      setError("Please provide both a start and end time.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/parent/sessions/${session.id}/reschedule-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requested_start_time: new Date(startVal).toISOString(),
            requested_end_time: new Date(endVal).toISOString(),
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to submit request");
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/parent/sessions/${session.id}/reschedule-request`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to withdraw request");
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-[#1F2E3B] text-lg font-semibold">
            {mode === "edit" ? "Request Reschedule" : "Session Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#2B4257]/70 hover:text-[#2B4257] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {mode === "view" ? (
          <>
            <div className="px-5 py-4 space-y-3 text-sm text-[#2B4257]">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
                  Student
                </p>
                <p className="font-medium">{session.studentName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
                  Coach
                </p>
                <p className="font-medium">
                  {session.coachName || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
                  Start
                </p>
                <p className="font-medium">
                  {formatDateTime(session.start_time)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
                  End
                </p>
                <p className="font-medium">
                  {session.end_time ? formatDateTime(session.end_time) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
                  Duration
                </p>
                <p className="font-medium">
                  {durationMin !== null ? `${durationMin} minutes` : "—"}
                </p>
              </div>

              {isPending &&
                session.requested_start_time &&
                session.requested_end_time && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-amber-800">
                      Reschedule pending
                    </p>
                    <p className="text-xs text-amber-900/80 mt-1">
                      Waiting for your coach to respond. We&apos;ll show the new
                      time here once they approve.
                    </p>
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-amber-900/70">
                          Requested start
                        </span>
                        <span className="font-medium text-amber-900 text-right">
                          {formatDateTime(session.requested_start_time)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-amber-900/70">Requested end</span>
                        <span className="font-medium text-amber-900 text-right">
                          {formatDateTime(session.requested_end_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              {isPending ? (
                <button
                  onClick={handleWithdraw}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? "Withdrawing…" : "Withdraw request"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setError("");
                    setMode("edit");
                  }}
                  className="px-4 py-2 rounded-lg border border-[#2B4257]/20 text-[#2B4257] text-sm font-medium hover:bg-[#2B4257]/5 transition-colors cursor-pointer"
                >
                  Request Reschedule
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#2B4257] text-white text-sm font-medium hover:bg-[#24394a] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4 text-sm text-[#2B4257]">
              <p className="text-xs text-[#2B4257]/60">
                Pick a new time for {session.studentName}&apos;s session with{" "}
                {session.coachName || "their coach"}. Your coach will be asked
                to approve before anything changes.
              </p>
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setError("");
                  setMode("view");
                }}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#2B4257]/20 text-[#2B4257] text-sm font-medium hover:bg-[#2B4257]/5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#2B4257] text-white text-sm font-medium hover:bg-[#24394a] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
