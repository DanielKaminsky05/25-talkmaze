import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountRow = Database["public"]["Tables"]["account"]["Row"];
type ParentRow = Database["public"]["Tables"]["parents"]["Row"];
type CoachRow = Database["public"]["Tables"]["coaches"]["Row"];
type StudentRow = Database["public"]["Tables"]["students"]["Row"];
type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type SubscriptionRow =
  Database["public"]["Tables"]["student_subscriptions"]["Row"];
type BookedSlotRow = Database["public"]["Tables"]["booked_slots"]["Row"];
type CoachAvailRow =
  Database["public"]["Tables"]["coach_availabilities"]["Row"];
type StudentAvailRow =
  Database["public"]["Tables"]["student_availabilities"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

// ─── Admin clients ────────────────────────────────────────────────────────────

function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient<Database>(url, serviceKey);
  const auth = db.auth.admin;
  return { db, auth };
}

// ─── Counters for unique values ───────────────────────────────────────────────

let counter = 0;
const next = () => ++counter;

// ─── Factories ────────────────────────────────────────────────────────────────

export interface TestAccount {
  id: string;
  email: string;
  password: string;
  role: number;
}

/**
 * Creates a Supabase auth user AND the matching `account` table row.
 * role: 1 = regular user (family), 2 = coach, 3 = admin
 */
export async function createAccount(
  overrides: Partial<{ role: number; email: string }> = {},
): Promise<TestAccount> {
  const { db, auth } = getClients();
  const n = next();
  const role = overrides.role ?? 1;
  const email = overrides.email ?? `test-user-${n}@test.talkmaze.com`;
  const password = "TestPassword123!";

  const { data: authData, error: authError } = await auth.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(`createAccount: auth error — ${authError?.message}`);
  }

  const { error: dbError } = await db.from("account").insert({
    id: authData.user.id,
    email,
    role,
    new: false,
  });
  if (dbError) throw new Error(`createAccount: db error — ${dbError.message}`);

  return { id: authData.user.id, email, password, role };
}

export async function createParent(
  account: TestAccount,
  overrides: Partial<ParentRow> = {},
): Promise<ParentRow> {
  const { db } = getClients();
  const n = next();
  const row = {
    account_id: account.id,
    first_name: overrides.first_name ?? "Test",
    last_name: overrides.last_name ?? `Parent${n}`,
    billing_email: overrides.billing_email ?? account.email,
    ...overrides,
  };
  const { data, error } = await db.from("parents").insert(row).select().single();
  if (error) throw new Error(`createParent: ${error.message}`);
  return data;
}

export async function createCoach(
  overrides: Partial<{ account: TestAccount }> = {},
): Promise<{ account: TestAccount; coach: CoachRow }> {
  const account = overrides.account ?? (await createAccount({ role: 2 }));
  const { db } = getClients();
  const n = next();
  const { data, error } = await db
    .from("coaches")
    .insert({
      account_id: account.id,
      first_name: "Coach",
      last_name: `Test${n}`,
    })
    .select()
    .single();
  if (error) throw new Error(`createCoach: ${error.message}`);
  return { account, coach: data };
}

export async function createAdmin(): Promise<TestAccount> {
  return createAccount({ role: 3 });
}

export async function createStudent(
  account: TestAccount,
  overrides: Partial<StudentRow> = {},
): Promise<StudentRow> {
  const { db } = getClients();
  const n = next();
  const { data, error } = await db
    .from("students")
    .insert({
      account_id: account.id,
      first_name: overrides.first_name ?? "Test",
      last_name: overrides.last_name ?? `Student${n}`,
      is_setup_complete: overrides.is_setup_complete ?? true,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`createStudent: ${error.message}`);
  return data;
}

export async function createPlan(
  overrides: Partial<PlanRow> = {},
): Promise<PlanRow> {
  const { db } = getClients();
  const { data, error } = await db
    .from("plans")
    .insert({
      name: overrides.name ?? "Test Plan",
      type: overrides.type ?? "standard",
      classes: overrides.classes ?? 8,
      cents: overrides.cents ?? 9900,
      currency: overrides.currency ?? "usd",
      renewal: overrides.renewal ?? "monthly",
      stripe_price_id: overrides.stripe_price_id ?? `price_test_${next()}`,
      is_active: overrides.is_active ?? true,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`createPlan: ${error.message}`);
  return data;
}

export async function createSubscription(
  student: StudentRow,
  plan: PlanRow,
  overrides: Partial<SubscriptionRow> = {},
): Promise<SubscriptionRow> {
  const { db } = getClients();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await db
    .from("student_subscriptions")
    .insert({
      student_id: student.id,
      account_id: student.account_id,
      plan_id: plan.id,
      status: "active",
      sessions_remaining: plan.classes,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`createSubscription: ${error.message}`);
  return data;
}

export async function createCoachAvailability(
  coach: CoachRow,
  weekday: number,
  startTime: string, // "HH:mm:ss"
  endTime: string,
  timezone = "America/New_York",
): Promise<CoachAvailRow> {
  const { db } = getClients();
  const { data, error } = await db
    .from("coach_availabilities")
    .insert({
      coach_id: coach.id,
      weekday,
      start_time: new Date(`1970-01-01T${startTime}Z`).toISOString(),
      end_time: new Date(`1970-01-01T${endTime}Z`).toISOString(),
      start_time_new: startTime,
      end_time_new: endTime,
      timezone,
    })
    .select()
    .single();
  if (error) throw new Error(`createCoachAvailability: ${error.message}`);
  return data;
}

export async function createStudentAvailability(
  student: StudentRow,
  weekday: number,
  startTime: string, // "HH:mm:ss"
  endTime: string,
  timezone = "America/New_York",
): Promise<StudentAvailRow> {
  const { db } = getClients();
  const { data, error } = await db
    .from("student_availabilities")
    .insert({
      student_id: student.id,
      weekday,
      start_time: new Date(`1970-01-01T${startTime}Z`).toISOString(),
      end_time: new Date(`1970-01-01T${endTime}Z`).toISOString(),
      start_time_new: startTime,
      end_time_new: endTime,
      timezone,
    })
    .select()
    .single();
  if (error) throw new Error(`createStudentAvailability: ${error.message}`);
  return data;
}

export async function createBookedSlot(
  coach: CoachRow,
  student: StudentRow,
  overrides: Partial<BookedSlotRow> = {},
): Promise<BookedSlotRow> {
  const { db } = getClients();
  const { data, error } = await db
    .from("booked_slots")
    .insert({
      coach_id: coach.id,
      student_id: student.id,
      weekday: overrides.weekday ?? 1, // Monday
      start_time: overrides.start_time ?? "14:00:00",
      end_time: overrides.end_time ?? "15:00:00",
      status: overrides.status ?? "active",
      timezone: overrides.timezone ?? "America/New_York",
      num_sessions: overrides.num_sessions ?? 8,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`createBookedSlot: ${error.message}`);
  return data;
}

export async function linkCoachToStudent(
  coach: CoachRow,
  student: StudentRow,
): Promise<void> {
  const { db } = getClients();
  const { error } = await db
    .from("coach_students")
    .insert({ coach_id: coach.id, student_id: student.id });
  if (error && !error.message.includes("duplicate")) {
    throw new Error(`linkCoachToStudent: ${error.message}`);
  }
}

export async function createSession(
  coach: CoachRow,
  student: StudentRow,
  overrides: Partial<SessionRow> = {},
): Promise<SessionRow> {
  const { db } = getClients();
  const now = new Date();
  const { data, error } = await db
    .from("sessions")
    .insert({
      coach_id: coach.id,
      student_id: student.id,
      start_time: overrides.start_time ?? now.toISOString(),
      end_time:
        overrides.end_time ??
        new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      weekday: overrides.weekday ?? now.getDay(),
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`createSession: ${error.message}`);
  return data;
}
