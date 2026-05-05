import { createClient } from "@supabase/supabase-js";

/**
 * Service role client - only use in server-side code (webhooks, cron jobs)
 * Needed to enable secure, server-to-server communication with admin privelages
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
