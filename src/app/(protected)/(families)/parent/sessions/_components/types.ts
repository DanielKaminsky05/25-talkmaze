export interface StudentProp {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface SessionProp {
  id: string;
  start_time: string;
  end_time: string | null;
  student_id: string;
  studentName: string;
  coachName: string;
}
