"use server";

import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { revalidatePath } from "next/cache";

type CoachInfoUpdate = {
  first_name?: string;
  last_name?: string;
  bio?: string | null;
  location?: string | null;
  specialty?: string | null;
  avatar_url?: string;
};

/**
 * Updates a coach's profile fields (only the fields provided are written).
 * Verifies ownership via account_id before updating.
 */
export async function updateCoachInfo(
  coachId: string,
  data: CoachInfoUpdate,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const payload: CoachInfoUpdate = {};
  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.last_name !== undefined) payload.last_name = data.last_name;
  if (data.bio !== undefined) payload.bio = data.bio || null;
  if (data.location !== undefined) payload.location = data.location || null;
  if (data.specialty !== undefined) payload.specialty = data.specialty || null;
  if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;

  if (Object.keys(payload).length === 0) return { success: true };

  const { error } = await supabase
    .from("coaches")
    .update(payload)
    .eq("id", coachId)
    .eq("account_id", user.id);

  if (error) {
    console.error("updateCoachInfo error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/coach/profile");
  return { success: true };
}
