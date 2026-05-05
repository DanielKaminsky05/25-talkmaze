import { cache } from "react";
import { createClient } from "@/src/services/supabase/server";

/**
 * Returns the currently authenticated Supabase user.
 * Memoized with React's `cache` - safe to call multiple times in the same
 * server render without extra round-trips to Supabase.
 * @returns The authenticated user, or `null` if not logged in.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
});
