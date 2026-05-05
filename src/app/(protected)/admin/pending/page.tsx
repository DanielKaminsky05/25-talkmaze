"use client";

import { useEffect, useState, useMemo } from "react";

import AdminCalendar from "../_components/AdminCalendar";
import type { PendingBooking, PendingBookingForm } from "@/src/lib/scheduling/types";
import type { Coach, PendingBookingPreview } from "../_types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function timeInputValue(value: string) {
  return value.slice(0, 5);
}

function weekdayFromDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T12:00:00Z`).getUTCDay();
}

function formFromPendingBooking(booking: PendingBooking): PendingBookingForm {
  return {
    coach_id: booking.coach_id,
    weekday: booking.weekday,
    start_date: booking.start_date ?? "",
    start_time: timeInputValue(booking.start_time),
    end_time: timeInputValue(booking.end_time),
    timezone: booking.timezone,
    num_sessions: booking.num_sessions ?? 1,
  };
}

const selectClass =
  "w-full bg-[#162330] border border-white/10 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#B1E7D6]/40";

export default function PendingPage() {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [pendingBookingsLoading, setPendingBookingsLoading] = useState(true);
  const [approvingBookingId, setApprovingBookingId] = useState<string | null>(
    null,
  );
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editingBookingForm, setEditingBookingForm] =
    useState<PendingBookingForm | null>(null);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [selectedPendingBookingId, setSelectedPendingBookingId] = useState<
    string | null
  >(null);
  const [pendingPreview, setPendingPreview] =
    useState<PendingBookingPreview | null>(null);
  const [pendingPreviewLoading, setPendingPreviewLoading] = useState(false);
  const [pendingPreviewError, setPendingPreviewError] = useState("");
  const [employees, setEmployees] = useState<Coach[]>([]);

  const fetchPendingBookings = async () => {
    try {
      setPendingBookingsLoading(true);
      const res = await fetch("/api/admin/pending-bookings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const bookings = Array.isArray(data) ? data : [];
      setPendingBookings(bookings);
      setSelectedPendingBookingId(
        (current) => current ?? bookings[0]?.id ?? null,
      );
    } catch {
      setPendingBookings([]);
    } finally {
      setPendingBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const selectedPendingBooking = useMemo(
    () =>
      pendingBookings.find((b) => b.id === selectedPendingBookingId) ??
      pendingBookings[0] ??
      null,
    [pendingBookings, selectedPendingBookingId],
  );

  const selectedPendingBookingForm = useMemo(
    () =>
      selectedPendingBooking
        ? editingBookingId === selectedPendingBooking.id && editingBookingForm
          ? editingBookingForm
          : formFromPendingBooking(selectedPendingBooking)
        : null,
    [editingBookingForm, editingBookingId, selectedPendingBooking],
  );

  const pendingPreviewInitialDate = useMemo(() => {
    const datedEvents = [
      ...(pendingPreview?.proposedEvents ?? []),
      ...(pendingPreview?.conflictEvents ?? []),
    ]
      .map((event) => (typeof event.start === "string" ? event.start : null))
      .filter((start): start is string => !!start)
      .sort();
    return datedEvents[0];
  }, [pendingPreview]);

  useEffect(() => {
    if (!selectedPendingBooking || !selectedPendingBookingForm) {
      setPendingPreview(null);
      return;
    }

    let cancelled = false;
    async function loadPreview() {
      setPendingPreviewLoading(true);
      setPendingPreviewError("");
      try {
        const res = await fetch(
          `/api/admin/pending-bookings/${selectedPendingBooking!.id}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedPendingBookingForm),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load preview");
        if (!cancelled) setPendingPreview(data);
      } catch (error) {
        if (!cancelled) {
          setPendingPreview(null);
          setPendingPreviewError(
            error instanceof Error ? error.message : "Failed to load preview",
          );
        }
      } finally {
        if (!cancelled) setPendingPreviewLoading(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedPendingBooking?.id, selectedPendingBookingForm]);

  const handleApprovePendingBooking = async (bookingId: string) => {
    setApprovingBookingId(bookingId);
    const res = await fetch(
      `/api/admin/pending-bookings/${bookingId}/approve`,
      { method: "POST" },
    );
    const data = await res.json().catch(() => ({}));
    setApprovingBookingId(null);
    if (!res.ok) {
      alert(data.error ?? "Failed to approve booking");
      return;
    }
    setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
    setSelectedPendingBookingId((current) =>
      current === bookingId ? null : current,
    );
  };

  const startEditingPendingBooking = (booking: PendingBooking) => {
    setSelectedPendingBookingId(booking.id);
    setEditingBookingId(booking.id);
    setEditingBookingForm(formFromPendingBooking(booking));
  };

  const cancelEditingPendingBooking = () => {
    setEditingBookingId(null);
    setEditingBookingForm(null);
  };

  const updateEditingBookingForm = <K extends keyof PendingBookingForm>(
    key: K,
    value: PendingBookingForm[K],
  ) => {
    setEditingBookingForm((prev) => {
      const base =
        prev ??
        (selectedPendingBooking
          ? formFromPendingBooking(selectedPendingBooking)
          : null);
      return base ? { ...base, [key]: value } : base;
    });
  };

  const handleSavePendingBooking = async (bookingId: string) => {
    if (!editingBookingForm) return;
    setSavingBookingId(bookingId);
    const res = await fetch(`/api/admin/pending-bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingBookingForm),
    });
    const data = await res.json().catch(() => ({}));
    setSavingBookingId(null);
    if (!res.ok) {
      alert(data.error ?? "Failed to update booking");
      return;
    }
    setPendingBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? data : b)),
    );
    cancelEditingPendingBooking();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-white text-xl font-bold">Pending Bookings</h2>
          <p className="text-white/35 text-sm mt-1">
            Edit a pending match and preview how approval will affect the coach
            calendar.
          </p>
        </div>
        <button
          onClick={fetchPendingBookings}
          className="shrink-0 px-3.5 py-2 text-xs font-semibold text-[#1F2E3B] bg-[#B1E7D6] hover:bg-[#9ed4c1] rounded-xl transition-colors"
        >
          Refresh
        </button>
      </div>

      {pendingBookingsLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pendingBookings.length === 0 ? (
        <div className="bg-[#1F2E3B] rounded-2xl p-8 border border-white/5 text-center">
          <p className="text-white/35 text-sm">No pending bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
          {/* Booking list */}
          <div className="space-y-2">
            {pendingBookings.map((booking) => {
              const coachName = booking.coaches
                ? `${booking.coaches.first_name ?? ""} ${booking.coaches.last_name ?? ""}`.trim() ||
                  "Coach"
                : "Coach";
              const studentName = booking.students
                ? `${booking.students.first_name ?? ""} ${booking.students.last_name ?? ""}`.trim() ||
                  "Student"
                : "Student";
              const isSelected = selectedPendingBooking?.id === booking.id;

              return (
                <button
                  key={booking.id}
                  onClick={() => {
                    setSelectedPendingBookingId(booking.id);
                    if (editingBookingId !== booking.id)
                      cancelEditingPendingBooking();
                  }}
                  className={`w-full text-left bg-[#1F2E3B] rounded-2xl p-4 border transition-colors ${
                    isSelected
                      ? "border-[#B1E7D6]/70"
                      : "border-white/5 hover:border-white/15"
                  }`}
                >
                  <p className="text-white text-sm font-semibold truncate">
                    {studentName}
                  </p>
                  <p className="text-white/45 text-xs mt-1 truncate">
                    {coachName}
                  </p>
                  <p className="text-white/35 text-xs mt-2">
                    {WEEKDAYS[booking.weekday] ?? "Weekly"}{" "}
                    {booking.start_time.slice(0, 5)}-
                    {booking.end_time.slice(0, 5)}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {booking.num_sessions ?? 0} sessions
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detail + calendar */}
          {selectedPendingBooking && selectedPendingBookingForm && (
            <div className="space-y-4">
              <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
                <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3 flex-1">
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Coach
                      </p>
                      <select
                        value={selectedPendingBookingForm.coach_id}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm("coach_id", e.target.value);
                        }}
                        className={selectClass}
                      >
                        {employees.map((coach) => (
                          <option key={coach.id} value={coach.id}>
                            {`${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim() ||
                              "Coach"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Day
                      </p>
                      <select
                        value={selectedPendingBookingForm.weekday}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm(
                            "weekday",
                            Number(e.target.value),
                          );
                        }}
                        className={selectClass}
                      >
                        {WEEKDAYS.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Start date
                      </p>
                      <input
                        type="date"
                        value={selectedPendingBookingForm.start_date}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm(
                            "start_date",
                            e.target.value,
                          );
                          const weekday = weekdayFromDateInput(e.target.value);
                          if (weekday != null)
                            updateEditingBookingForm("weekday", weekday);
                        }}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Start
                      </p>
                      <input
                        type="time"
                        value={selectedPendingBookingForm.start_time}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm(
                            "start_time",
                            e.target.value,
                          );
                        }}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        End
                      </p>
                      <input
                        type="time"
                        value={selectedPendingBookingForm.end_time}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm("end_time", e.target.value);
                        }}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Timezone
                      </p>
                      <input
                        type="text"
                        value={selectedPendingBookingForm.timezone}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm("timezone", e.target.value);
                        }}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">
                        Sessions
                      </p>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={selectedPendingBookingForm.num_sessions}
                        onChange={(e) => {
                          if (editingBookingId !== selectedPendingBooking.id)
                            startEditingPendingBooking(selectedPendingBooking);
                          updateEditingBookingForm(
                            "num_sessions",
                            Number(e.target.value),
                          );
                        }}
                        className={selectClass}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleSavePendingBooking(selectedPendingBooking.id)
                      }
                      disabled={
                        savingBookingId === selectedPendingBooking.id ||
                        editingBookingId !== selectedPendingBooking.id
                      }
                      className="px-4 py-2 text-xs font-semibold text-[#1F2E3B] bg-[#B1E7D6] hover:bg-[#9ed4c1] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                      {savingBookingId === selectedPendingBooking.id
                        ? "Saving..."
                        : "Save"}
                    </button>
                    <button
                      onClick={() =>
                        handleApprovePendingBooking(selectedPendingBooking.id)
                      }
                      disabled={
                        approvingBookingId === selectedPendingBooking.id ||
                        pendingPreviewLoading ||
                        !pendingPreview?.canApprove ||
                        editingBookingId === selectedPendingBooking.id
                      }
                      className="px-4 py-2 text-xs font-semibold text-[#1F2E3B] bg-[#65CFAD] hover:bg-[#50bfa0] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                      {approvingBookingId === selectedPendingBooking.id
                        ? "Approving..."
                        : "Approve"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <span className="text-white/45">
                    {editingBookingId === selectedPendingBooking.id
                      ? "Save changes before approving"
                      : pendingPreviewLoading
                        ? "Checking schedule..."
                        : pendingPreviewError
                          ? pendingPreviewError
                          : pendingPreview?.canApprove
                            ? `Ready: ${pendingPreview.generatedCount}/${pendingPreview.requestedCount} sessions can be created`
                            : `Blocked: ${pendingPreview?.generatedCount ?? 0}/${pendingPreview?.requestedCount ?? selectedPendingBookingForm.num_sessions} sessions can be created`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#1e4535] border border-[#65CFAD]" />
                  <span className="text-white/40 text-xs">Coach only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#315F9E] border border-[#8DBDFF]" />
                  <span className="text-white/40 text-xs">Student only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#2F8F83] border border-[#8CF0DF]" />
                  <span className="text-white/40 text-xs">Both available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#B1E7D6]" />
                  <span className="text-white/40 text-xs">Existing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#294b63]/60" />
                  <span className="text-white/40 text-xs">Recurring block</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#F2C14E]" />
                  <span className="text-white/40 text-xs">Proposed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#B94A48]" />
                  <span className="text-white/40 text-xs">Conflict</span>
                </div>
              </div>

              <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
                <AdminCalendar
                  events={[
                    ...(pendingPreview?.availabilityEvents ?? []),
                    ...(pendingPreview?.activeBookedEvents ?? []),
                    ...(pendingPreview?.existingSessionEvents ?? []),
                    ...(pendingPreview?.proposedEvents ?? []),
                    ...(pendingPreview?.conflictEvents ?? []),
                  ]}
                  initialView="timeGridWeek"
                  initialDate={pendingPreviewInitialDate}
                  loading={pendingPreviewLoading}
                  offsetPx={420}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
