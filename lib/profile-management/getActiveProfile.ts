import { cookies } from "next/headers";

/**
 * Retrieves the active profile's ID and type from cookies.
 *
 * This function reads the "active_profile_id" and "active_profile_type" cookies
 * which are expected to be set when a user selects a profile.
 * If either cookie is missing or invalid, the function returns null.
 *
 * @returns An object containing the profile's id and type 
 */
export async function getActiveProfile(): Promise<{
  id: string;
  type: "student" | "parent";
} | null> {
  const cookieStore = await cookies();

  // Retrieve the profile ID from cookies, or null if not present
  const id = cookieStore.get("active_profile_id")?.value ?? null;

  // Retrieve the profile type from cookies, or null if not present
  const type = cookieStore.get("active_profile_type")?.value as
    | "student"
    | "parent"
    | null;

  if (!id || !type) return null;

  return { id, type };
}
