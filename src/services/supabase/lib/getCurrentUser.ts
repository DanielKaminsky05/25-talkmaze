import { cache } from "react";
import { createClient } from "../server";

/**
 * Retrieves the current authenticated user from Supabase.
 *
 * This function is memoized using React's `cache` utility to optimize performance
 * by avoiding redundant calls to the Supabase API.
 *
 * @async
 * @function
 * @returns {Promise<Object|null>} The current user object if authenticated, or `null` if no user is logged in.
 */
export const getCurrentUser = cache(async () => {
  // Create an instance of the Supabase client
  const supabase = await createClient();

  // Fetch and return the current authenticated user
  return (await supabase.auth.getUser()).data.user;
});
