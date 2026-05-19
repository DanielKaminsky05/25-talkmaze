import { createClient } from "@supabase/supabase-js";
import type { TestAccount } from "./factories";

/**
 * Signs in as the given test account and returns a Cookie header string
 * in the format that @supabase/ssr's createServerClient can read.
 *
 * The cookie name is derived from the Supabase project URL, matching
 * what createServerClient sets during the session refresh flow.
 */
export async function signSessionFor(account: TestAccount): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (error || !data.session) {
    throw new Error(`signSessionFor: could not sign in — ${error?.message}`);
  }

  // @supabase/ssr stores the session under a key derived from the project ref.
  // For local Supabase (http://127.0.0.1:54321) the key is `sb-127-auth-token`.
  // For a hosted project like `zfnmverkmybrasrwhjyg.supabase.co` the key is
  // `sb-zfnmverkmybrasrwhjyg-auth-token`.
  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const sessionJson = JSON.stringify([
    data.session.access_token,
    data.session.refresh_token,
  ]);

  // URL-encode the value to survive cookie parsing.
  return `${cookieName}=${encodeURIComponent(sessionJson)}`;
}

/** Convenience constant for unauthenticated requests. */
export const ANON = { cookies: "" } as const;
