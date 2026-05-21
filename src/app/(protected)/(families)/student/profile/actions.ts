"use server";

import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { revalidatePath } from "next/cache";

type StudentInfoUpdate = {
  first_name?: string;
  last_name?: string;
  bio?: string | null;
  location?: string | null;
  grade?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string;
};

/**
 * Updates a student's profile fields (only the fields provided are written).
 * Verifies ownership via account_id before updating.
 */
export async function updateStudentInfo(
  studentId: string,
  data: StudentInfoUpdate,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const payload: StudentInfoUpdate = {};
  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.last_name !== undefined) payload.last_name = data.last_name;
  if (data.bio !== undefined) payload.bio = data.bio || null;
  if (data.location !== undefined) payload.location = data.location || null;
  if (data.grade !== undefined) payload.grade = data.grade || null;
  if (data.date_of_birth !== undefined) payload.date_of_birth = data.date_of_birth || null;
  if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;

  if (Object.keys(payload).length === 0) return { success: true };

  const { error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", studentId)
    .eq("account_id", user.id); // ownership check

  if (error) {
    console.error("updateStudentInfo error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/student/profile");
  return { success: true };
}
