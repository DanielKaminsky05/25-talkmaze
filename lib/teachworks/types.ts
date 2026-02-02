export interface TeachworksLesson {
  id: number;
  name: string;
  description: string;
  series_id: number | null;
  location_name: string;
  location_id: number;
  parent_location_name: string | null;
  parent_location_id: number | null;
  employee_name: string;
  employee_id: number;
  service_name: string;
  service_id: number;
  spaces: number | null;
  joinable: boolean | null;
  from_date: string; // YYYY-MM-DD
  from_time: string; // HH:MM:SS
  to_date: string;
  to_time: string;
  time_zone: string;
  from_datetime: string; // ISO 8601
  to_datetime: string; // ISO 8601
  duration_minutes: number;
  status: "Scheduled" | "Attended" | "Cancelled" | "Missed" | string;
  custom_status: string | null;
  wage: string;
  wage_payment_id: number | null;
  cost_override: string | null;
  override_method: string;
  override_value: string | null;
  request_comments: string | null;
  requested_at: string | null;
  request_customer_id: number | null;
  request_student_id: number | null;
  vehicle_id: number | null;
  sms_sent_at: string | null;
  reminder_sent_at: string | null;
  cancelled_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  participants: TeachworksParticipant[];
}

export interface TeachworksParticipant {
  id: number;
  lesson_id: number;
  student_name: string;
  student_id: number;
  description: string | null;
  status: "Scheduled" | "Attended" | "Cancelled" | "Missed" | string;
  custom_status: string | null;
  unit_price: string;
  cost_premium_included: string;
  discount_rate: string | null;
  amount: string;
  cost_override_method: string | null;
  public_notes: string | null;
  private_notes: string | null;
  invoice_id: number | null;
  student_reminder_sent_at: string | null;
  family_reminder_sent_at: string | null;
  student_sms_sent_at: string | null;
  family_sms_sent_at: string | null;
  cancelled_sent_at: string | null;
  notes_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetLessonsParams {
  student_id?: string | number;
  from_date?: string; // YYYY-MM-DD
  "from_date[gt]"?: string;
  "from_date[gte]"?: string;
  "from_date[lt]"?: string;
  "from_date[lte]"?: string;
  to_date?: string;
  "to_date[gt]"?: string;
  "to_date[gte]"?: string;
  "to_date[lt]"?: string;
  "to_date[lte]"?: string;
  page?: number;
  per_page?: number;
  direction?: "asc" | "desc";
  status?: string;
  // Add other filters as needed
}
