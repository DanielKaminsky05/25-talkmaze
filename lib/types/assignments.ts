export interface Assignment {
  id: string;
  coach_id: string;
  student_id: string;
  created_at?: string;
  coaches?: {
    first_name: string;
    last_name: string;
  };
  students?: {
    first_name: string;
    last_name: string;
  };
}