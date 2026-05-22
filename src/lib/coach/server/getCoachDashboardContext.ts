import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";
import type { Database } from "@/src/services/supabase/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

interface CoachAccount {
  id: string;
  email: string;
}

export interface CoachDashboardContext {
  account: CoachAccount;
  students: Student[];
}

/**
 * Fetches the authenticated coach's account identity plus assigned students.
 * Used by coach dashboard routes for URL-driven selection and redirects.
 */
export async function getCoachDashboardContext(): Promise<CoachDashboardContext> {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not found");

  const supabase = await createClient();

  const [{ data: account }, { data: coachData }] = await Promise.all([
    supabase.from("account").select("id, email").eq("id", user.id).single(),
    supabase.from("coaches").select("id").eq("account_id", user.id).single(),
  ]);

  if (!account) throw new Error("Account not found");
  if (!coachData) throw new Error("Coach profile not found");

  const { data: assignments, error: assignmentsError } = await supabase
    .from("coach_students")
    .select("students(*)")
    .eq("coach_id", coachData.id);

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  // Sort deterministically by name. Without an ORDER BY Postgres can return
  // rows in different orders across requests, which makes the student-list
  // pagination snap to a different page on every navigation (e.g. clicking
  // a student would seem to "reset" the list because the same student now
  // lives at a different index, and therefore a different page).
  const students = ((assignments ?? [])
    .map((row) => row.students)
    .filter(Boolean) as Student[])
    .sort((a, b) => {
      const aName = `${a.first_name ?? ""} ${a.last_name ?? ""}`.toLowerCase();
      const bName = `${b.first_name ?? ""} ${b.last_name ?? ""}`.toLowerCase();
      if (aName !== bName) return aName < bName ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

  return {
    account: {
      id: account.id,
      email: account.email,
    },
    students,
  };
}
