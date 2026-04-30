export interface Assignment {
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
}