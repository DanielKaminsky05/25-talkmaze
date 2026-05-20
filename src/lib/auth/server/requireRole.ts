import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/src/services/supabase/server";
import type { Database } from "@/src/services/supabase/types/database";

export type Role = 1 | 2 | 3;

export type AuthContext = {
  user: User;
  account: { id: string; role: Role; email: string };
  supabase: SupabaseClient<Database>;
};

/**
 * Asserts the caller is authenticated and their `account.role` is in `allowedRoles`.
 * Returns the resolved auth context on success.
 * Returns a `NextResponse` (401, 403, or 500) on failure — the caller must early-return it.
 *
 * Pass an empty array to require only authentication (any role).
 */
export async function requireRole(
  allowedRoles: Role[],
): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("account")
    .select("id, role, email")
    .eq("id", user.id)
    .single();

  if (!account) {
    console.error("requireRole: session valid but no account row", {
      userId: user.id,
    });
    return NextResponse.json({ error: "Account not found" }, { status: 500 });
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(account.role as Role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    user,
    account: {
      id: account.id,
      role: account.role as Role,
      email: account.email,
    },
    supabase,
  };
}
