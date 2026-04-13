export interface Assignment {
  id: string;
  coach_id: string;
  student_id: string;
  created_at?: string;
  coaches?: {
    name: string | null;
  };
  students?: {
    name: string | null;
  };
}