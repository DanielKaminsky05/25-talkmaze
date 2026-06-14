import "server-only";

import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import type { Contact } from "../types";

/**
 * The calling coach's messageable contacts: every student assigned to them via
 * `coach_students`, plus the parents of those students (linked by the family's
 * shared `account_id`).
 *
 * `Contact.id` is the family profile id (student/parent row id), the value the
 * coach `/message/[id]` route and the coach unread map are keyed on. The
 * display name mirrors the families format: `"First Last (email)"`.
 *
 * Returns `[]` when there is no session or on error.
 */
export async function getCoachContacts(): Promise<Contact[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();

  if (coachError || !coach) {
    if (coachError) console.error("getCoachContacts coach lookup", coachError);
    return [];
  }

  const { data: links, error: linksError } = await supabase
    .from("coach_students")
    .select("student_id")
    .eq("coach_id", coach.id);

  if (linksError) {
    console.error("getCoachContacts assignment lookup", linksError);
    return [];
  }

  const studentIds = (links ?? []).map((l) => l.student_id);
  if (studentIds.length === 0) return [];

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, last_name, avatar_url, account_id")
    .in("id", studentIds);

  if (studentsError || !students) {
    if (studentsError)
      console.error("getCoachContacts students", studentsError);
    return [];
  }

  const accountIds = [...new Set(students.map((s) => s.account_id))];

  const [{ data: parents }, { data: accounts }] = await Promise.all([
    supabase
      .from("parents")
      .select("id, first_name, last_name, avatar_url, account_id")
      .in("account_id", accountIds),
    supabase.from("account").select("id, email").in("id", accountIds),
  ]);

  const emailByAccount = new Map((accounts ?? []).map((a) => [a.id, a.email]));

  const toContact = (row: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    account_id: string;
  }): Contact => {
    const email = emailByAccount.get(row.account_id) ?? "";
    const displayName =
      `${row.first_name || ""} ${row.last_name || ""}`.trim() || email;
    return {
      id: row.id,
      name: email ? `${displayName} (${email})` : displayName,
      email,
      avatar_url: row.avatar_url ?? null,
    };
  };

  const contacts = [
    ...students.map(toContact),
    ...(parents ?? []).map(toContact),
  ];

  return contacts.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
}
