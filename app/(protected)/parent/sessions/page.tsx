import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import ParentSessionsClient, {
  type StudentProp,
  type SessionProp,
} from "./ParentSessionsClient";

/**
 * /parent/sessions — Server Component
 *
 * Fetches all students for the logged-in parent and their upcoming sessions,
 * then passes the data to the client component for rendering and filtering.
 */
export default async function ParentSessionsPage() {
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[ParentSessions] Auth error:", authError.message);
  }

  if (!user) {
    redirect("/login");
  }

  // ── Students ────────────────────────────────────────────────────────────────
  const { data: studentsRaw, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, last_name, avatar_url")
    .eq("account_id", user.id);

  if (studentsError) {
    console.error(
      "[ParentSessions] Failed to fetch students:",
      studentsError.message,
      { code: studentsError.code, details: studentsError.details }
    );
  }

  const students: StudentProp[] = (studentsRaw ?? []).map((s: any) => ({
    id: s.id,
    name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student",
    avatar_url: s.avatar_url ?? null,
  }));

  // ── Sessions ────────────────────────────────────────────────────────────────
  const studentIds = students.map((s) => s.id);
  let sessions: SessionProp[] = [];

  if (studentIds.length > 0) {
    const now = new Date().toISOString();

    const { data: sessionsRaw, error: sessionsError } = await supabase
      .from("sessions")
      .select(
        `id, start_time, end_time, student_id,
         students(first_name, last_name),
         coaches(first_name, last_name)`
      )
      .in("student_id", studentIds)
      .gte("start_time", now)
      .order("start_time", { ascending: true });

    if (sessionsError) {
      console.error(
        "[ParentSessions] Failed to fetch sessions:",
        sessionsError.message,
        { code: sessionsError.code, details: sessionsError.details }
      );
    }

    sessions = (sessionsRaw ?? []).map((s: any) => ({
      id: s.id.toString(),
      start_time: s.start_time,
      end_time: s.end_time,
      student_id: s.student_id,
      studentName: s.students
        ? `${s.students.first_name ?? ""} ${s.students.last_name ?? ""}`.trim() ||
        "Student"
        : "Student",
      coachName: s.coaches
        ? `${s.coaches.first_name ?? ""} ${s.coaches.last_name ?? ""}`.trim()
        : "",
    }));
  }

  return <ParentSessionsClient students={students} sessions={sessions} />;
}
