import { createClient } from "@supabase/supabase-js";
import type { TestAccount } from "./factories";

/**
 * Signs in as the given test account and returns a Cookie header string
 * in the format that @supabase/ssr's createServerClient can read.
 *
 * NOTE:
 * Supabase SSR cookie format is NOT a single JSON blob.
 * @supabase/ssr stores the session across one or more cookies:
 *   sb-<projectRef>-auth-token.0
 *   sb-<projectRef>-auth-token.1
 *   ...
 *
 * In CI (Supabase CLI v2.100.1+), the keys and resulting token size can change,
 * which makes the session too large to fit into a single cookie.
 * When we set only `sb-<projectRef>-auth-token`, the server can't read the
 * session and treats the request as unauthenticated.
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

  const projectRef = new URL(url).hostname.split(".")[0];
  const baseName = `sb-${projectRef}-auth-token`;

  const encoded = encodeURIComponent(JSON.stringify(data.session));

  // Match @supabase/ssr chunking behavior: split into ~3.8KB pieces.
  // Keep comfortably under the 4096-byte cookie limit (including name/attrs).
  const MAX_CHUNK_SIZE = 3800;

  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += MAX_CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + MAX_CHUNK_SIZE));
  }

  // If it fits in one cookie, keep the simple form.
  if (chunks.length === 1) {
    return `${baseName}=${chunks[0]}`;
  }

  // Otherwise emit cookie header with chunk suffixes.
  return chunks.map((chunk, idx) => `${baseName}.${idx}=${chunk}`).join("; ");
}

/** Convenience constant for unauthenticated requests. */
export const ANON = { cookies: "" } as const;
