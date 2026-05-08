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

  const students = (assignments ?? [])
    .map((row) => row.students)
    .filter(Boolean) as Student[];

  return {
    account: {
      id: account.id,
      email: account.email,
    },
    students,
  };
}
