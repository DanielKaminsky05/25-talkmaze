import type { TablesInsert } from "@/src/services/supabase/types/database";

export type CoachingSession = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  description?: string;
  student_id?: string;
  studentName: string;
  coachName?: string;
  status?: string;
};

export type SchedulingResult = {
  success: boolean;
  status: number;
  message?: string;
  error?: string;
};

export type BookedSlotForApproval = {
  id: string;
  coach_id: string;
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  status: string;
  num_sessions: number | null;
  start_date: string | null;
};

export type PendingBooking = {
  id: string;
  coach_id: string;
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  status: string;
  num_sessions: number | null;
  start_date: string | null;
  created_at: string;
  coaches?: { first_name: string | null; last_name: string | null } | null;
  students?: {
    first_name: string | null;
    last_name: string | null;
    account_id: string | null;
  } | null;
};

export type PendingBookingForm = {
  coach_id: string;
  weekday: number;
  start_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  num_sessions: number;
};

export type GeneratedSession = TablesInsert<"sessions">;

export const TIME_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Winnipeg",
  "America/Denver",
  "America/Edmonton",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export type OnboardingTimeZone = (typeof TIME_ZONES)[number];
