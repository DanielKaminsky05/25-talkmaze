"use server";
import { ReactNode } from "react";
import Contacts from "./_components/Contacts";
import UnreadContacts from "./_components/UnreadContacts";
import AssignedCoachSection, {
  type AssignedCoachEntry,
} from "./_components/AssignedCoachSection";
import { type AssignedCoach } from "./_components/CoachProfileCard";
import { createClient } from "@/src/services/supabase/server";
import { Contact } from "@/src/lib/messaging/types";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";

// Layout of Coach Page both for /coach and /coach/[conversation]
export default async function Layout({ children }: { children: ReactNode }) {
  const [contacts, coachEntries] = await Promise.all([
    getContacts(),
    getAssignedCoachEntries(),
  ]);

  return (
    <div
      className="flex flex-col md:flex-row md:gap-6 h-full
      rounded-xl p-8"
    >
      <div className="flex flex-col gap-4 max-w-[384px] md:basis-1/3">
        {/* Contacts filter bar*/}
        <Contacts contacts={contacts} />
        {/* Contacts with unread messages */}
        <UnreadContacts contacts={contacts} />
        {/* Assigned-coach paginator + card */}
        <AssignedCoachSection entries={coachEntries} />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Fetch all coach accounts (role=2) as contacts */
async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("account")
    .select("id, email")
    .neq("id", user.id)
    .eq("role", 2)
    .order("email");

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }

  const coachAccountIds = data.map((a) => a.id);

  const { data: coaches } =
    coachAccountIds.length > 0
      ? await supabase
          .from("coaches")
          .select("account_id, first_name, last_name, avatar_url")
          .in("account_id", coachAccountIds)
      : {
          data: [] as {
            account_id: string;
            first_name: string | null;
            last_name: string | null;
            avatar_url: string | null;
          }[],
        };

  const coachInfoMap = new Map(
    (coaches ?? []).map((c) => [
      c.account_id,
      {
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || null,
        avatar_url: c.avatar_url,
      },
    ]),
  );

  return data.map((acc) => {
    const info = coachInfoMap.get(acc.id);
    const displayName = info?.name ?? acc.email;
    return {
      id: acc.id,
      name: `${displayName} (${acc.email})`,
      email: acc.email,
      avatar_url: info?.avatar_url ?? null,
    };
  });
}

/**
 * Resolves the list of assigned-coach entries to surface on /message.
 *
 * - Student profile active: one entry per coach assigned to that student;
 *   `forStudentName` is null (the student already knows it's their coach).
 * - Parent profile active: one entry per (coach, student) pair across every
 *   student under the parent's account; `forStudentName` carries the student's
 *   display name. The same coach teaching two students yields two entries.
 * - Otherwise: empty array.
 */
async function getAssignedCoachEntries(): Promise<AssignedCoachEntry[]> {
  const active = await getActiveProfile();
  if (!active) return [];

  const supabase = await createClient();

  if (active.type === "student") {
    const { data, error } = await supabase
      .from("coach_students")
      .select(
        "coaches!inner(first_name, last_name, avatar_url, bio, location, specialty)",
      )
      .eq("student_id", active.id);

    if (error || !data) return [];

    return data
      .map((row) => row.coaches as AssignedCoach)
      .filter(Boolean)
      .sort(sortByCoachName)
      .map((coach) => ({ coach, forStudentName: null }));
  }

  // parent
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("account_id", user.id);

  if (studentsError || !students || students.length === 0) return [];

  const studentNameById = new Map(
    students.map((s) => [
      s.id,
      `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student",
    ]),
  );

  const { data: assignments, error: assignmentsError } = await supabase
    .from("coach_students")
    .select(
      "student_id, coaches!inner(first_name, last_name, avatar_url, bio, location, specialty)",
    )
    .in(
      "student_id",
      students.map((s) => s.id),
    );

  if (assignmentsError || !assignments) return [];

  return assignments
    .map((row) => ({
      coach: row.coaches as AssignedCoach,
      forStudentName: studentNameById.get(row.student_id) ?? null,
    }))
    .filter((e) => e.coach)
    .sort((a, b) => {
      const byCoach = sortByCoachName(a.coach, b.coach);
      if (byCoach !== 0) return byCoach;
      return (a.forStudentName ?? "").localeCompare(b.forStudentName ?? "");
    });
}

function sortByCoachName(a: AssignedCoach, b: AssignedCoach): number {
  const aKey = `${a.last_name ?? ""} ${a.first_name ?? ""}`
    .trim()
    .toLowerCase();
  const bKey = `${b.last_name ?? ""} ${b.first_name ?? ""}`
    .trim()
    .toLowerCase();
  return aKey.localeCompare(bKey);
}
