"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * Server action to select an active profile (parent or student).
 * Validates the profile and optional PIN.
 * Sets cookies for active profile id and type.
 * Redirects to /home on success, or back to /profiles with error on failure.
 */
export async function selectProfile(formData: FormData) {
  // Extract profile data from form submission
  const profileId = formData.get("profileId") as string;
  const profileType = formData.get("profileType") as "student" | "parent";
  const pin = formData.get("pin") as string | null;

 
  // Ensure required fields are present
  if (!profileId || !profileType) throw new Error("Missing profile data");

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if user is not authenticated
  if (!user) redirect("/login");

  // Validate profile and PIN for parent
  if (profileType === "parent") {
    const { data: parent, error } = await supabase
      .from("parents")
      .select("id, profile_access_pin")
      .eq("id", profileId)
      .eq("account_id", user.id)
      .single();

    if (error || !parent) redirect("/profiles?error=not_found");

    // If PIN is set for parent, validate it
    if (parent!.profile_access_pin != null) {
      if (!pin || pin !== parent!.profile_access_pin) {
        redirect("/profiles?error=wrong_pin");
      }
    }
  } else {
    // Validate profile and PIN for student
    const { data: student, error } = await supabase
      .from("students")
      .select("id, profile_access_pin")
      .eq("id", profileId)
      .eq("account_id", user.id)
      .single();

    if (error || !student) redirect("/profiles?error=not_found");

    if (student!.profile_access_pin != null) {
      if (!pin ||pin !== student!.profile_access_pin) {
        redirect("/profiles?error=wrong_pin");
      }
    }
  }

  // Set cookies for active profile id and type
  const cookieStore = await cookies();
  cookieStore.set("active_profile_id", profileId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("active_profile_type", profileType, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  
  redirect("/home");
}
