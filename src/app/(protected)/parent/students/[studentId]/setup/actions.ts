"use server";

import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assignCoachToStudent } from "@/src/lib/scheduling/server/matchmaking";
import { OnboardingTimeZone } from "@/src/app/(protected)/onboarding/types";
import { buildAvailabilityRows } from "@/src/lib/scheduling/server/availability";

export async function completeStudentSetup(
  studentId: string,
  grade: number,
  notes: string,
  timezone: OnboardingTimeZone,
  weeklyAvailability: Record<string, { start: string; end: string }[]>,
) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Verify the student belongs to this account
  const { data: student } = await supabase
    .from("students")
    .select("id, account_id")
    .eq("id", studentId)
    .eq("account_id", user.id)
    .single();

  if (!student) {
    return { success: false, error: "Student not found" };
  }

  // Update student profile fields and mark setup as complete
  const { error: studentError } = await supabase
    .from("students")
    .update({
      grade: String(grade),
      notes,
      is_setup_complete: true,
    })
    .eq("id", studentId);

  if (studentError) {
    console.error("completeStudentSetup: student update failed:", studentError);
    return { success: false, error: "Failed to update student" };
  }

  // Replace availability (clean slate)
  await supabase
    .from("student_availabilities")
    .delete()
    .eq("student_id", studentId);

  const availabilityRows = buildAvailabilityRows({
    studentId,
    weeklyAvailability,
    timeZone: timezone,
  });

  if (availabilityRows.length > 0) {
    const { error: availError } = await supabase
      .from("student_availabilities")
      .insert(availabilityRows);

    if (availError) {
      console.error(
        "completeStudentSetup: availability insert failed:",
        availError,
      );
      return { success: false, error: "Failed to save availability" };
    }
  }

  // Find the active subscription to know how many sessions to schedule
  const { data: subscription } = await supabase
    .from("student_subscriptions")
    .select("sessions_remaining")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .single();

  const numClasses = subscription?.sessions_remaining ?? 0;

  if (numClasses > 0) {
    try {
      await assignCoachToStudent(studentId, numClasses);
    } catch (err) {
      console.error("completeStudentSetup: coach assignment failed:", err);
    }
  }

  revalidatePath("/parent");
  redirect("/parent");
}
