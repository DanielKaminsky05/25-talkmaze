"use server";

import { cookies } from "next/headers";

/**
 * Sets the active profile cookies (ID and Type).
 * This is a low-level utility meant to be used by Server Actions.
 */
export async function setProfileCookies(profileId: string, profileType: "student" | "parent") {
  const cookieStore = await cookies();
  
  cookieStore.set("active_profile_id", profileId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  
  cookieStore.set("active_profile_type", profileType, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  
  return { success: true };
}
