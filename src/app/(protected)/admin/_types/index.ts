import type { EventInput } from "@fullcalendar/core";

export type Student = {
  id: string;
  account_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  date_of_birth: string | null;
  grade: string | null;
  lesson_space_id: string | null;
  lesson_space_student_link: string | null;
  lesson_space_teacher_link: string | null;
  location: string | null;
  notes: string | null;
  post_lesson_days: number | null;
  post_lesson_tasks_enabled: boolean | null;
  webhook_room_id: string | null;
};

export type Coach = {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
};

export interface Course {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

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

export type PendingBookingPreview = {
  availabilityEvents: EventInput[];
  existingSessionEvents: EventInput[];
  activeBookedEvents: EventInput[];
  proposedEvents: EventInput[];
  conflictEvents: EventInput[];
  conflicts: { start: string; end: string; reason: string }[];
  canApprove: boolean;
  generatedCount: number;
  requestedCount: number;
};

export type Assignment = {
  id: string;
  coach_id: string;
  student_id: string;
  created_at?: string;
  coaches?: {
    first_name: string | null;
    last_name: string | null;
  };
  students?: {
    first_name: string | null;
    last_name: string | null;
    account_id: string | null;
  };
};
