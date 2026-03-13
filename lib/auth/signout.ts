"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * Signs out the current user from Supabase authentication,
 * clears active profile cookies, and redirects to the login page.
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  // Delete active profile cookies
  const cookieStore = await cookies();
  cookieStore.delete("active_profile_id");
  cookieStore.delete("active_profile_type");

  redirect("/login");
}
