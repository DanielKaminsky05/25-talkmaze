export interface RescheduleRequest {
  id: number;
  start_time: string | null;
  end_time: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  requested_at: string | null;
  student_id: string | null;
  students: { first_name: string | null; last_name: string | null } | null;
}
