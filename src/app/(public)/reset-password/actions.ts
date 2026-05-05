"use server";

import { createClient } from "@/src/services/supabase/server";

/**
 * Updates the user's password using Supabase Auth.
 * This is used after the user has clicked the link in the reset password email.
 * @param password The new password to set.
 */
export async function updatePassword(password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Error updating password:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
