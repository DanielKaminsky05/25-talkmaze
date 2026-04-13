"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

/**
 * Sends a password reset email to the user via Supabase Auth.
 * @param email The email address of the user.
 */
export async function sendResetEmail(email: string) {
  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") || "";
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("Error sending reset email:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
