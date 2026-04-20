import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ParentDashboardClient, { Student } from "./components/ParentDashboardClient";
import { Appointment } from "../types/lesson";

/**
 * Top-level page component for Parent Dashboard Home
 * Fetches all the required data, and passes it to the client component
 */
export default async function ParentDashboard() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch students for this account
  const { data: studentsRaw } = await supabase
    .from("students")
    .select(
      `id, first_name, last_name, grade, avatar_url, location, date_of_birth, bio,
       student_subscriptions(sessions_remaining, status, plans(classes))`,
    )
    .eq("account_id", user.id);

  const students: Student[] = (studentsRaw ?? []).map((s: any) => {
    const subscription = s.student_subscriptions?.[0] ?? null;
    return {
      id: s.id,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
      first_name: s.first_name,
      last_name: s.last_name,
      grade: s.grade,
      avatar_url: s.avatar_url,
      location: s.location,
      date_of_birth: s.date_of_birth,
      bio: s.bio,
      remaining_lessons: subscription?.sessions_remaining ?? 0,
      total_lessons: subscription?.plans?.classes ?? 0,
      status: subscription?.status ?? "inactive",
    };
  });

  // Fetch upcoming sessions for these students
  const studentIds = students.map((s) => s.id);
  let schedule: Appointment[] = [];

  if (studentIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select(
        `id, start_time, end_time, student_id,
         students(first_name),
         coaches(name)`,
      )
      .in("student_id", studentIds)
      .order("start_time", { ascending: true });

    schedule = (sessions ?? []).map((session: any) => ({
      id: session.id.toString(),
      title: "Public Speaking Session",
      start_date: session.start_time,
      end_date: session.end_time,
      description: "",
      studentName: session.students?.first_name ?? "Student",
      coachName: session.coaches?.name ?? "Coach",
      status: "scheduled",
    }));
  }

  return <ParentDashboardClient students={students} schedule={schedule} />;
}
