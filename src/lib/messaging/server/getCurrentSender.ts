import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Resolves sender display metadata for the current actor.
 *
 * Uses the active parent/student profile for role=1 (family) users, or the
 * coach profile linked to the account for coach/admin users.
 *
 * @param userId  The authenticated account id (`auth.uid()`); used to look up
 *                the coach profile for non-family actors.
 * @param userRole  The account role code: `1` = family (student/parent),
 *                  `2` = coach, `3` = admin.
 * @param profile  The active family profile (`{ id, type }`) for role=1 users,
 *                 or `null` for coach/admin actors.
 * @returns The actor's display `name` (falls back to `"Unknown"`) and
 *          `avatar_url` (`null` when unset).
 */
export async function getCurrentSender(
  userId: string,
  userRole: number,
  profile: { id: string; type: "student" | "parent" } | null,
): Promise<{ name: string; avatar_url: string | null }> {
  const supabase = await createClient();

  // If the current actor is a parent OR student
  if (userRole === 1 && profile) {
    const table = profile.type === "parent" ? "parents" : "students";
    const { data } = await supabase
      .from(table)
      .select("first_name, last_name, avatar_url")
      .eq("id", profile.id)
      .single();
    return {
      name: data
        ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
        : "Unknown",
      avatar_url: data?.avatar_url ?? null,
    };
  }

  // If current actor is a coach or admin
  const { data } = await supabase
    .from("coaches")
    .select("first_name, last_name, avatar_url")
    .eq("account_id", userId)
    .single();
  return {
    name: data
      ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
      : "Unknown",
    avatar_url: data?.avatar_url ?? null,
  };
}
