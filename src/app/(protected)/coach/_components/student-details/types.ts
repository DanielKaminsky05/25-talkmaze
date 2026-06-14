import type { Database } from "@/src/services/supabase/types/database";

export type AttendanceStatus = "attended" | "missed" | "cancelled";

export interface CoachSession {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reschedule_status: "pending" | null;
}

type Course = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "id" | "title" | "description" | "created_at"
>;

export interface CoachCourseListItem extends Course {
  assignment: {
    id: string;
    isActive: boolean;
    assigned_at: string;
    progress: number;
  } | null;
}
