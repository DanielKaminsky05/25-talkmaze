import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/src/services/supabase/service";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

function normalizeTime(value: unknown) {
  if (typeof value !== "string") return null;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  return null;
}

function normalizeAvailabilityTime(value: string | null) {
  if (!value) return null;
  const normalized = normalizeTime(value);
  if (normalized) return normalized;
  if (value.length > 10) return `${value.slice(11, 16)}:00`;
  return null;
}

function timeStringToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

type AvailabilityInterval = {
  weekday: number;
  start: number;
  end: number;
};

function toAvailabilityIntervals(
  rows: {
    weekday: number | null;
    start_time: string | null;
    end_time: string | null;
    start_time_new: string | null;
    end_time_new: string | null;
  }[] | null,
) {
  return (rows ?? [])
    .map((slot) => {
      const start = normalizeAvailabilityTime(slot.start_time_new ?? slot.start_time);
      const end = normalizeAvailabilityTime(slot.end_time_new ?? slot.end_time);
      if (slot.weekday == null || !start || !end) return null;
      return {
        weekday: slot.weekday,
        start: timeStringToMinutes(start),
        end: timeStringToMinutes(end),
      };
    })
    .filter((slot): slot is AvailabilityInterval => !!slot && slot.start < slot.end);
}

function intervalContains(intervals: AvailabilityInterval[], weekday: number, start: number, end: number) {
  return intervals.some((interval) => (
    interval.weekday === weekday &&
    interval.start <= start &&
    interval.end >= end
  ));
}

function buildAvailabilityEvents(
  coachAvailability: AvailabilityInterval[],
  studentAvailability: AvailabilityInterval[],
) {
  const events = [];

  for (let weekday = 0; weekday <= 6; weekday++) {
    const dayCoach = coachAvailability.filter((slot) => slot.weekday === weekday);
    const dayStudent = studentAvailability.filter((slot) => slot.weekday === weekday);
    const boundaries = Array.from(
      new Set([...dayCoach, ...dayStudent].flatMap((slot) => [slot.start, slot.end])),
    ).sort((a, b) => a - b);

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      if (start === end) continue;

      const coachCan = intervalContains(dayCoach, weekday, start, end);
      const studentCan = intervalContains(dayStudent, weekday, start, end);
      if (!coachCan && !studentCan) continue;

      const variant = coachCan && studentCan
        ? {
            title: "Both available",
            backgroundColor: "#2F8F83",
            borderColor: "#8CF0DF",
            textColor: "#F2FFFC",
          }
        : studentCan
          ? {
              title: "Student available",
              backgroundColor: "#315F9E",
              borderColor: "#8DBDFF",
              textColor: "#F4F8FF",
            }
          : {
              title: "Coach available",
              backgroundColor: "#1e4535",
              borderColor: "#65CFAD",
              textColor: "#65CFAD",
            };

      events.push({
        daysOfWeek: [weekday],
        startTime: minutesToTimeString(start),
        endTime: minutesToTimeString(end),
        ...variant,
      });
    }
  }

  return events;
}

function nextMatchingDateForWeekday(weekday: number) {
  let testDate = dayjs.utc().add(1, "day");
  while (testDate.day() !== weekday) {
    testDate = testDate.add(1, "day");
  }
  return testDate.format("YYYY-MM-DD");
}

function startDateForPreview(startDate: string, weekday: number) {
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : nextMatchingDateForWeekday(weekday);
}

function recurringSlotRangeForOccurrence(
  slot: { weekday: number; start_time: string; end_time: string; timezone: string },
  occurrenceStartUTC: dayjs.Dayjs,
) {
  const slotDateLocal = occurrenceStartUTC.tz(slot.timezone).day(slot.weekday);
  const slotStartLocal = dayjs.tz(`${slotDateLocal.format("YYYY-MM-DD")}T${slot.start_time}`, slot.timezone);
  const slotEndLocal = dayjs.tz(`${slotDateLocal.format("YYYY-MM-DD")}T${slot.end_time}`, slot.timezone);

  return {
    startUTC: slotStartLocal.utc(),
    endUTC: slotEndLocal.utc(),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  const coachId = typeof body.coach_id === "string" ? body.coach_id.trim() : "";
  const weekday = Number(body.weekday);
  const startTime = normalizeTime(body.start_time);
  const endTime = normalizeTime(body.end_time);
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const numSessions = Number(body.num_sessions);
  const startDate = typeof body.start_date === "string" ? body.start_date.trim() : "";

  if (!coachId) return NextResponse.json({ error: "Coach is required" }, { status: 400 });
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "Weekday must be between 0 and 6" }, { status: 400 });
  }
  if (!startTime || !endTime || startTime >= endTime) {
    return NextResponse.json({ error: "Start and end times must be valid, with start before end" }, { status: 400 });
  }
  if (!timezone) return NextResponse.json({ error: "Timezone is required" }, { status: 400 });
  if (!Number.isInteger(numSessions) || numSessions <= 0) {
    return NextResponse.json({ error: "Number of sessions must be a positive integer" }, { status: 400 });
  }
  if (startDate && new Date(`${startDate}T12:00:00Z`).getUTCDay() !== weekday) {
    return NextResponse.json({ error: "Start date must match the selected weekday" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: pendingSlot, error: pendingSlotError } = await supabase
    .from("booked_slots")
    .select("id, student_id")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (pendingSlotError || !pendingSlot) {
    return NextResponse.json({ error: "Pending booked slot not found" }, { status: 404 });
  }

  const [{ data: availability }, { data: studentAvailability }, { data: sessions }, { data: activeSlots }, { data: student }] = await Promise.all([
    supabase
      .from("coach_availabilities")
      .select("weekday, start_time, end_time, start_time_new, end_time_new")
      .eq("coach_id", coachId),
    supabase
      .from("student_availabilities")
      .select("weekday, start_time, end_time, start_time_new, end_time_new")
      .eq("student_id", pendingSlot.student_id),
    supabase
      .from("sessions")
      .select("id, start_time, end_time, student_id, students(first_name, last_name)")
      .eq("coach_id", coachId),
    supabase
      .from("booked_slots")
      .select("*, students(first_name, last_name)")
      .eq("status", "active")
      .or(`coach_id.eq.${coachId},student_id.eq.${pendingSlot.student_id}`),
    supabase
      .from("students")
      .select("first_name, last_name")
      .eq("id", pendingSlot.student_id)
      .maybeSingle(),
  ]);

  const availabilityEvents = buildAvailabilityEvents(
    toAvailabilityIntervals(availability ?? null),
    toAvailabilityIntervals(studentAvailability ?? null),
  );

  const existingSessionEvents = (sessions ?? []).map((session: any) => {
    const sessionStudent = session.students;
    const studentName = sessionStudent
      ? `${sessionStudent.first_name ?? ""} ${sessionStudent.last_name ?? ""}`.trim() || "Booked"
      : "Booked";

    return {
      id: `existing-${session.id}`,
      title: studentName,
      start: session.start_time,
      end: session.end_time ?? undefined,
      backgroundColor: "#B1E7D6",
      borderColor: "transparent",
      textColor: "#1F2E3B",
    };
  });

  const activeBookedEvents = (activeSlots ?? [])
    .filter((slot) => slot.coach_id === coachId)
    .map((slot: any) => {
      const slotStudent = slot.students;
      const studentLabel = slotStudent
        ? `${slotStudent.first_name ?? ""} ${slotStudent.last_name ?? ""}`.trim() || "Recurring booked"
        : "Recurring booked";

      return {
        id: `active-${slot.id}`,
        daysOfWeek: [slot.weekday],
        startTime: slot.start_time.slice(0, 5),
        endTime: slot.end_time.slice(0, 5),
        title: studentLabel,
        display: "background",
        backgroundColor: "rgba(41,75,99,0.38)",
        borderColor: "transparent",
      };
    });

  const studentName = student
    ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Proposed"
    : "Proposed";
  const durationMinutes = Math.max(1, timeStringToMinutes(endTime) - timeStringToMinutes(startTime));
  const anchorDate = startDateForPreview(startDate, weekday);
  const anchorStart = dayjs.tz(`${anchorDate}T${startTime}`, timezone);

  const proposedEvents = [];
  const conflictEvents = [];
  const conflicts = [];
  let successfullyGenerated = 0;
  let weekOffset = 0;
  const maxWeeks = numSessions * 3;

  while (successfullyGenerated < numSessions && weekOffset <= maxWeeks) {
    const targetDate = anchorStart.add(weekOffset, "week").format("YYYY-MM-DD");
    const occurrenceStart = dayjs.tz(`${targetDate}T${startTime}`, timezone);
    const occurrenceEnd = occurrenceStart.add(durationMinutes, "minute");
    const occurrenceStartUTC = occurrenceStart.utc();
    const occurrenceEndUTC = occurrenceEnd.utc();

    const hasSessionConflict = (sessions ?? []).some((session) => {
      if (!session.start_time || !session.end_time) return false;
      return occurrenceStartUTC.isBefore(dayjs.utc(session.end_time)) && occurrenceEndUTC.isAfter(dayjs.utc(session.start_time));
    });

    const hasRecurringConflict = (activeSlots ?? []).some((slot) => {
      if (!slot.timezone || !slot.start_time || !slot.end_time) return false;
      const range = recurringSlotRangeForOccurrence(slot, occurrenceStartUTC);
      return occurrenceStartUTC.isBefore(range.endUTC) && occurrenceEndUTC.isAfter(range.startUTC);
    });

    if (hasSessionConflict || hasRecurringConflict) {
      const reason = hasSessionConflict ? "Overlaps an existing session" : "Overlaps an active recurring booking";
      conflictEvents.push({
        id: `conflict-${weekOffset}`,
        title: reason,
        start: occurrenceStartUTC.toISOString(),
        end: occurrenceEndUTC.toISOString(),
        backgroundColor: "#B94A48",
        borderColor: "#F2B8B5",
        textColor: "#ffffff",
      });
      conflicts.push({
        start: occurrenceStartUTC.toISOString(),
        end: occurrenceEndUTC.toISOString(),
        reason,
      });
    } else {
      proposedEvents.push({
        id: `proposed-${weekOffset}`,
        title: `Proposed: ${studentName}`,
        start: occurrenceStartUTC.toISOString(),
        end: occurrenceEndUTC.toISOString(),
        backgroundColor: "#F2C14E",
        borderColor: "#F8E1A1",
        textColor: "#1F2E3B",
      });
      successfullyGenerated++;
    }

    weekOffset++;
  }

  return NextResponse.json({
    availabilityEvents,
    existingSessionEvents,
    activeBookedEvents,
    proposedEvents,
    conflictEvents,
    conflicts,
    canApprove: proposedEvents.length === numSessions,
    generatedCount: proposedEvents.length,
    requestedCount: numSessions,
  });
}
