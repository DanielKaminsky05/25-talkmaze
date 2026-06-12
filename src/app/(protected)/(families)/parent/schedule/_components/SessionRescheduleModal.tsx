"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionProp } from "./types";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/src/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { formatDateTime, getDurationMin } from "../_lib/sessionDateUtils";

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

export default function SessionRescheduleModal({
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
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent variant="light" size="md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Request Reschedule" : "Session Details"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? `Pick a new time for ${session.studentName}'s session with ${
                  session.coachName || "their coach"
                }. Your coach will be asked to approve before anything changes.`
              : "Review the details for this session."}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" ? (
          <>
            <div className="space-y-3 text-sm text-[#2B4257]">
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

            <DialogFooter>
              {isPending ? (
                <Button
                  variant="outline-light"
                  size="md"
                  onClick={handleWithdraw}
                  disabled={submitting}
                >
                  {submitting ? "Withdrawing…" : "Withdraw request"}
                </Button>
              ) : (
                <Button
                  variant="outline-light"
                  size="md"
                  onClick={() => {
                    setError("");
                    setMode("edit");
                  }}
                >
                  Request Reschedule
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 text-sm text-[#2B4257]">
              <Field>
                <FieldLabel htmlFor="reschedule-start">Start</FieldLabel>
                <Input
                  id="reschedule-start"
                  type="datetime-local"
                  size="sm"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reschedule-end">End</FieldLabel>
                <Input
                  id="reschedule-end"
                  type="datetime-local"
                  size="sm"
                  value={endVal}
                  onChange={(e) => setEndVal(e.target.value)}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
            </div>

            <DialogFooter>
              <Button
                variant="outline-light"
                size="md"
                onClick={() => {
                  setError("");
                  setMode("view");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
