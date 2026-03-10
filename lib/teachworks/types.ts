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

export interface TeachworksCustomField {
  field_id: number;
  name: string;
  value: string;
}

export interface TeachworksDefaultTeacher {
  id: number;
  first_name: string;
  last_name: string;
}

export interface TeachworksDefaultService {
  id: number;
  name: string;
}

export interface TeachworksStudent {
  id: number;
  customer_id: number;
  student_type: "child" | "individual" | string;
  first_name: string;
  last_name: string;
  email: string;
  additional_email: string | null;
  home_phone: string;
  mobile_phone: string;
  birth_date: string | null;
  start_date: string | null;
  school: string;
  grade: string;
  additional_notes: string;
  calendar_color: string;
  default_location_id: number | null;
  subjects: string;
  status: "Active" | "Inactive" | string;
  time_zone: string | null;
  billing_method: string;
  student_cost: string | null;
  cost_premium_id: number | null;
  discount_rate: string | null;
  email_lesson_reminders: number;
  email_lesson_notes: number;
  sms_lesson_reminders: number;
  user_account: number | null;
  unviewed: boolean;
  welcome_sent_at: string | null;
  created_at: string;
  updated_at: string;
  custom_fields: TeachworksCustomField[];
  default_teachers: TeachworksDefaultTeacher[];
  default_services: TeachworksDefaultService[];
}

export interface TeachworksEmployee {
  id: number;
  employee_type: string;
  include_as_teacher: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  home_phone: string;
  address: string;
  address_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  birth_date: string | null;
  hire_date: string | null;
  position: string;
  additional_notes: string;
  subjects: string;
  status: "Active" | "Inactive" | string;
  time_zone: string | null;
  wage_type: string;
  employee_wage: string | null;
  wage_tier_id: number | null;
  work_wage_type: string;
  work_wage: string | null;
  bio: string;
  bio_drafted_at: string | null;
  bio_approved: string;
  bio_approved_at: string | null;
  photo: string;
  email_lesson_reminders: number;
  sms_lesson_reminders: number;
  calendar_default_view: string;
  calendar_color: string;
  calendar_color_by: string;
  user_account: number | null;
  unviewed: boolean;
  welcome_sent_at: string | null;
  created_at: string;
  updated_at: string;
  custom_fields: TeachworksCustomField[];
}

export interface TeachworksCourse {
  id: number;
  name: string;
  description?: string;
  status?: string;
}

export interface TeachworksFamily{
  id: number,
  first_name: string,
  last_name: string,
  customer_type: string,
  email: string | null,
  email_lesson_reminders: boolean | null,
  sms_lesson_reminders: boolean | null,
  mobile_phone: string | null,
  unviewed: boolean | null
}

export interface TeachworksTeacher {
  id: number;
  first_name: string;
  last_name: string;
}

export interface TeachworksService {
  id: number;
  name?: string;
}

