# API Auth

Every API route in `src/app/api/**` is in one of three categories: **public**, **role-gated**, or **signature-verified** (webhooks). This document defines the rule for each and the helpers that enforce them.

Companion docs:
- `docs/api-contract.md` — route shape, status codes, error format.
- `docs/api-ownership.md` — when an authorized caller is allowed to act on a *specific* resource.

---

## Roles

`account.role` is a small integer column:

| Role | Meaning | Where they live in the app |
|---|---|---|
| `1` | Regular user — family account (parent + students) | `(families)/` route group |
| `2` | Coach | `(coach)/` route group |
| `3` | Admin | `admin/` route group |

There is no fourth role today. Adding one means updating this doc, the `requireRole` helper, and the test matrices in `tests/integration/api/admin/auth-extended.test.ts`.

`role` is set at signup (`1` via DB trigger) and updated by admin-only routes (`/api/admin/create-admin` → `3`, `/api/admin/create-coach` → `2`). It is **never** trusted from a request body. Routes that accept a `role` field in their body are bugs (none today; do not add).

---

## The three categories

### Public routes

No auth check. The route is intentionally reachable by anyone.

- `/api/webhooks/stripe` — auth-by-signature instead. See webhook section below.
- `/api/webhooks/lessonspace` — same (note: signature verification not yet implemented; see `docs/repo-quality-audit.md`).
- `/api/checkout` *when* `studentId === "new"` — the signup flow. The rest of the route requires auth.

Public routes are explicitly excluded from `updateSession()` (middleware layer 1) by path. When adding a new public route, you must also add it to the middleware exclusion list and document the reason here.

### Role-gated routes

Every other route. The first three lines of the handler are auth.

```ts
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function POST(req: Request) {
  const auth = await requireRole([3]);              // admin only
  if (auth instanceof Response) return auth;        // 401 or 403
  const { user, supabase, account } = auth;

  // ...rest of the handler
}
```

The helper does both checks in one call: `401` if no session, `403` if the session exists but `account.role` isn't in the allowed list.

### Signature-verified routes (webhooks)

No session, no role. The body's signature is the credential. Pattern:

```ts
export async function POST(req: Request) {
  const body = await req.text();           // raw body for signature verification
  const sig = req.headers.get("stripe-signature");
  if (!sig) return Response.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ...dispatch on event.type
}
```

Webhooks use `createServiceRoleClient()` from `src/services/supabase/service.ts`. They are the **only** legitimate consumer of the service-role client outside test setup.

---

## The `requireRole` helper

This helper does not exist yet. Add it as `src/lib/auth/server/requireRole.ts` as the first concrete code change after these docs land.

```ts
// src/lib/auth/server/requireRole.ts
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/services/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
 * Returns a `NextResponse` (401 or 403) on failure — the caller must early-return it.
 *
 * Pass an empty array to require only authentication (any role).
 */
export async function requireRole(
  allowedRoles: Role[],
): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("account")
    .select("id, role, email")
    .eq("id", user.id)
    .single();

  if (!account) {
    // Authenticated session but no account row — data inconsistency, not auth failure.
    console.error("requireRole: session valid but no account row", { userId: user.id });
    return NextResponse.json({ error: "Account not found" }, { status: 500 });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(account.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { user, account: account as AuthContext["account"], supabase };
}
```

### Usage

```ts
// Admin only
const auth = await requireRole([3]);
if (auth instanceof Response) return auth;

// Coach or admin (attendance write)
const auth = await requireRole([2, 3]);
if (auth instanceof Response) return auth;

// Any authenticated user (e.g. attendance read)
const auth = await requireRole([]);
if (auth instanceof Response) return auth;
```

### Why a helper, not middleware

Two options were considered:
1. **Per-route helper** (this doc). Each route calls `requireRole` on line 1.
2. **Middleware-based** — put the check in `src/middleware.ts` keyed by URL prefix.

The audit recommends option 2 long-term. This doc commits to option 1 *now* because:
- It makes auth visible at the route — a reviewer reading `students/route.ts` sees the gate immediately.
- It doesn't require maintaining a URL-pattern → role mapping in two places.
- The current `src/middleware.ts` is already complex (session refresh, redirect logic, RBAC for *pages*); adding API gates there bloats it further.

If/when option 2 lands, this helper stays as the implementation — middleware calls into the same function. The route-level call goes away last.

### What it does *not* do

`requireRole` does not check **ownership** — that is, whether this authenticated caller is allowed to act on a specific student/coach/conversation. Ownership is a separate concern handled by helpers documented in `docs/api-ownership.md`. The split matters: many routes today have the role check (or are missing it) but no ownership check, and the audit catches both classes separately.

---

## The role gate per route group

The role rule is determined by the URL prefix, with one exception (`/api/attendance`). The full mapping:

| Route prefix | Required roles | Notes |
|---|---|---|
| `/api/admin/**` | `[3]` | Without exception. 17 routes don't have this today — those are audit-flagged. |
| `/api/coach/**` | `[2]` | Plus ownership check via `coach_students`. |
| `/api/parent/**` | `[1]` | Plus ownership check via `students.account_id`. |
| `/api/user/**` | `[]` (any authed) | User account self-management. |
| `/api/profiles/**` | `[1]` | Family profile selection. |
| `/api/lesson-progress/**` | `[1, 2, 3]` | Both family-facing and coach-facing reads. |
| `/api/checkout` | mixed — see below | Public for `studentId === "new"`, role `[1]` otherwise. |
| `/api/subscriptions/**` | `[1]` | Plus ownership. |
| `/api/attendance` (GET) | `[]` (any authed) | Read access for parent + coach + admin. |
| `/api/attendance` (POST, DELETE) | `[2, 3]` | Coach or admin only. |
| `/api/webhooks/**` | none | Signature-verified. |

When this matrix changes, update this doc *first*, then the helper's call sites.

### The `/api/checkout` exception

Checkout has a public sub-flow (signup → new account) and an authed sub-flow (existing parent buying a plan for an existing student). The route handles this by branching on `studentId === "new"`:

```ts
export async function POST(req: Request) {
  const parsed = CheckoutSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error);

  if (parsed.data.studentId === "new") {
    // public flow — no auth, but validation must be strict
    return handleNewSignup(parsed.data);
  }

  // authed flow
  const auth = await requireRole([1]);
  if (auth instanceof Response) return auth;
  // + ownership check on parsed.data.studentId
  return handleExistingCheckout(auth, parsed.data);
}
```

**Note the validation runs before the branch**, so the public path still rejects malformed bodies. The auth check runs *after* validation only because we need to know which path to take — but the public path is intentional, not accidental. Document this in the route's comment.

Today's checkout route gets this branch wrong in two ways: it logs the password (`route.ts:25`) and it stores the password in Stripe metadata (`:197`). Both are tracked in the audit; both should be fixed by **removing the password field from the route entirely** — the client calls `supabase.auth.signUp()` directly before invoking checkout. See `docs/api-contract.md#side-effects-and-idempotency`.

---

## Anti-patterns to avoid

### "Auth-via-data-lookup"

Several coach routes today do:

```ts
const { data: coach } = await supabase.from("coaches").select("id").eq("account_id", user.id).single();
if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 403 });
```

This returns `403` for a caller who isn't a coach. It works *by accident* — a regular user happens to have no row in `coaches`. The intent is "block non-coaches"; the implementation says "fail if this user has no coach record." Two things wrong:

1. Wrong status code. Missing row is `404` or `500` depending on whether it's expected to exist. Wrong role is `403`. Conflating them means a coach whose `coaches` row was accidentally deleted gets `403 Forbidden` instead of a useful error.
2. Misses the security check. A future migration that creates `coaches` rows for everyone (for any reason) instantly opens every coach route to every user.

**Fix.** Always run `requireRole([2])` first. The coach row lookup is for *data*, not for *auth*.

### "Role check after mutation"

```ts
// ❌
const inserted = await supabase.from("foo").insert(...);
const { data: account } = await supabase.from("account").select("role")...;
if (account.role !== 3) return Response.json({ error: "Forbidden" }, { status: 403 });
```

Auth runs before any DB write. Always. The mutation+then+role pattern is a security bug even if the response says `403` — the data is already changed.

### "Role check inside try/catch"

```ts
// ❌
try {
  const auth = await requireRole([3]);
  if (auth instanceof Response) return auth;
  ...
} catch (err) {
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

Wrapping `requireRole` in a try/catch turns "you're not allowed" into "something broke." Move auth above the try/catch:

```ts
// ✅
const auth = await requireRole([3]);
if (auth instanceof Response) return auth;

try {
  // business logic
} catch (err) {
  // ...
}
```

### "Commented-out auth check"

`src/app/api/admin/create-admin/route.ts:41-46` — the role check is in a comment block. This is the canonical example in the audit. Any commented-out auth is a critical bug. If a check is wrong, fix it; don't disable it.

---

## Testing the contract

`tests/integration/api/admin/auth.test.ts` and `auth-extended.test.ts` together describe the role matrix. After `requireRole` lands and the audit's auth-missing routes are fixed, ~80 RED tests turn GREEN. The test pattern is in `docs/testing-critique.md` — don't write new "expect(200)" tests; pair every status assertion with a side-effect assertion (`expectSideEffect(table, predicate)` or `expectNoSideEffect`).

The full test matrix to maintain:

```ts
// One declarative table for every gated route, used by every auth test file.
type AuthCase = {
  route: string;
  call: (cookies: string) => Promise<Response>;
  allowed: Role[];
};

for (const c of AUTH_CASES) {
  it(`${c.route} rejects anonymous`, () => expect(c.call(ANON)).status.toBe(401));
  it(`${c.route} rejects wrong role`, () => {
    for (const r of [1, 2, 3] as Role[]) {
      if (c.allowed.includes(r)) continue;
      expect(c.call(cookiesFor(r))).status.toBe(403);
    }
  });
  it(`${c.route} accepts allowed role`, () => {
    for (const r of c.allowed) {
      expect(c.call(cookiesFor(r))).status.not.toBe(401);
      expect(c.call(cookiesFor(r))).status.not.toBe(403);
    }
  });
}
```

This replaces `auth-extended.test.ts`'s 85-test wallpaper with one declarative matrix. Add a row, run the suite, done.
