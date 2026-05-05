"use server";

import { createClient } from "@/src/services/supabase/server";
import { revalidatePath } from "next/cache";

type ParentInfoUpdate = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  billing_email?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
};

/**
 * Updates a parent's profile fields (only the fields provided are written).
 * Verifies ownership via account_id before updating.
 */
export async function updateParentInfo(
  parentId: string,
  data: ParentInfoUpdate,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Only include defined fields in the update payload
  const payload: Record<string, string | null> = {};
  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.last_name !== undefined) payload.last_name = data.last_name;
  if (data.phone_number !== undefined) payload.phone_number = data.phone_number;
  if (data.billing_email !== undefined) payload.billing_email = data.billing_email;
  if (data.bio !== undefined) payload.bio = data.bio || null;
  if (data.location !== undefined) payload.location = data.location || null;
  if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;

  if (Object.keys(payload).length === 0) return { success: true };

  const { error } = await supabase
    .from("parents")
    .update(payload)
    .eq("id", parentId)
    .eq("account_id", user.id); // ownership check

  if (error) {
    console.error("updateParentInfo error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/parent/profile");
  return { success: true };
}

/**
 * Updates (or clears) a parent's profile access PIN.
 * Pass an empty string to remove the PIN.
 * Verifies ownership via account_id before updating.
 */
export async function updateParentPin(
  parentId: string,
  newPin: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("parents")
    .update({ profile_access_pin: newPin.trim() || null })
    .eq("id", parentId)
    .eq("account_id", user.id); // ownership check

  if (error) {
    console.error("updateParentPin error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/parent/profile");
  return { success: true };
}
