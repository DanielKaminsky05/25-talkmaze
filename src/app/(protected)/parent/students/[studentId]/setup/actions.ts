"use server";

import { createClient } from "@/src/services/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assignCoachToStudent } from "@/src/app/(protected)/onboarding/actions";
import { OnboardingTimeZone } from "@/src/app/(protected)/onboarding/types";

function toTimestamp(time: string) {
  return `1970-01-01T${time}:00Z`;
}

const dayMap: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

export async function completeStudentSetup(
  studentId: string,
  grade: number,
  notes: string,
  timezone: OnboardingTimeZone,
  weeklyAvailability: Record<string, { start: string; end: string }[]>,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const availabilityRows = Object.entries(weeklyAvailability).flatMap(
    ([day, slots]) =>
      slots
        .filter((slot) => slot.start && slot.end)
        .map((slot) => ({
          student_id: studentId,
          weekday: dayMap[day],
          start_time: toTimestamp(slot.start),
          end_time: toTimestamp(slot.end),
          start_time_new: `${slot.start}:00`,
          end_time_new: `${slot.end}:00`,
          timezone,
        })),
  );

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
