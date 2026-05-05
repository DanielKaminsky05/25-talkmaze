export interface Course {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

import type { EventInput } from "@fullcalendar/core";

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
