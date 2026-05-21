import { createClient } from "@supabase/supabase-js";
import { createAccount, type TestAccount } from "./factories";

export type Role = 1 | 2 | 3;

/**
 * Signs in as the given test account and returns a Cookie header string
 * in the format that @supabase/ssr's createServerClient can read.
 *
 * The cookie name is derived from the Supabase project URL hostname:
 *   http://127.0.0.1:54321  →  sb-127-auth-token
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

  // @supabase/ssr stores the full session JSON under a cookie named
  // sb-{projectRef}-auth-token. projectRef = first hostname segment.
  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(data.session));

  return `${cookieName}=${cookieValue}`;
}

/** Convenience constant for unauthenticated requests. */
export const ANON = { cookies: "" } as const;

/**
 * Creates a fresh account with the given role and returns its session-bearing
 * Cookie header. Each call yields a new account — safe to use inside `it()`
 * blocks alongside `beforeEach(resetAll)`.
 */
export async function cookiesFor(role: Role): Promise<string> {
  const account = await createAccount({ role });
  return signSessionFor(account);
}
