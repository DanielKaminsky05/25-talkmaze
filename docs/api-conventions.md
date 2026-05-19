# API Route Conventions

Audit of patterns across `src/app/api/`. Use this when adding or editing a route so you match the working examples and not the broken ones.

## The right shape for a protected route

```ts
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";
// import a Zod schema for the body
// import any domain logic from src/lib/<domain>/

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("account").select("role").eq("id", user.id).single();
  if (account?.role !== 3) {                       // role gate where applicable
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = MySchema.safeParse(await req.json()); // Zod, not manual checks
  if (!body.success) return Response.json({ error: body.error.format() }, { status: 400 });

  // call into src/lib/<domain>/, inspect { data, error } from Supabase
}
```

Good examples to copy from:

- **`src/app/api/attendance/route.ts`** — auth + multi-role check (`role !== 2 && role !== 3`) on POST and DELETE. The cleanest pattern in the repo today.
- **`src/app/api/admin/create-coach/route.ts`** — auth + `account.role === 3` gate before any work.
- **`src/app/api/parent/students/[studentId]/availability/route.ts`** — auth + `verifyOwnership()` helper that confirms the student belongs to the caller before reading/writing.
- **`src/app/api/subscriptions/{cancel,resume,schedule,schedule/cancel}/route.ts`** — auth + `resolveStudentIdForBilling()` ownership helper.

## Auth client choice

- **`createClient()` from `src/services/supabase/server.ts`** — default; uses the user's session, RLS applies.
- **`createServiceRoleClient()` from `src/services/supabase/service.ts`** — bypasses RLS. **Only legitimate in webhooks** (`/api/webhooks/stripe`, `/api/webhooks/lessonspace`), where there's no user session and the request is signature-verified.

Routes that currently misuse `createServiceRoleClient()` to skip auth (treat as bugs to fix when touching) — all four `pending-bookings` admin routes:

- `src/app/api/admin/pending-bookings/route.ts` (GET)
- `src/app/api/admin/pending-bookings/[id]/route.ts` (PATCH)
- `src/app/api/admin/pending-bookings/[id]/approve/route.ts` (POST)
- `src/app/api/admin/pending-bookings/[id]/preview/route.ts` (POST)

The full list of unprotected admin routes (no auth and no `createServiceRoleClient()` — they just rely on RLS, but RLS isn't sufficient for the operations they perform) is in `docs/repo-quality-audit.md`. There are 17 of them.

## Routes known to be missing auth or authorization

See `docs/repo-quality-audit.md` "CRITICAL" section for the full list (17 unprotected admin routes, 4 unprotected `pending-bookings` routes that also bypass RLS, plus `parent/students/[studentId]`, `coach/lessonspace/[coachId]/[studentId]`, the LessonSpace webhook without signature verification, and the commented-out RBAC check in `create-admin/route.ts`). Coach routes that authenticate the user but don't verify caller↔student ownership are also listed there.

When you edit any of these, add the protected-route pattern above; don't propagate the existing shape.

## Validation

Zod is a dependency but is not used by any route under `src/app/api/` as of this audit. Manual `typeof` / regex checks are scattered through routes (e.g. `pending-bookings/[id]/route.ts` PATCH handler). When you touch a route, replace inline validation with a Zod schema. Collocate it under `_schemas.ts` or `actions.ts` for route-only schemas; promote to `src/lib/<domain>/schemas.ts` once shared.

## Error handling

- Always destructure `{ data, error }` from Supabase calls and return a 4xx/5xx if `error` is set. Several routes currently return success regardless — don't copy that.
- Return errors as `{ error: string }` with appropriate HTTP status, not as 200s with an error key. Pick a shape and stick to it within a domain.

## The ESLint layering rule (`eslint.config.mjs`)

- Files under `src/**` may **not** import from `@/src/app/api/**`. The reverse is fine — API route handlers freely import `src/lib/**` business logic and `src/services/**` adapters.
- Files under `src/services/lessonspace/**` may not import from `@/src/lib/**`, `@/src/services/supabase/**`, or `@supabase/*`, and an AST rule rejects any `.from(...)` call. Keep adapters HTTP/SDK only.

If you add a new domain under `src/services/`, consider extending the same isolation rule to it.

## Auth helper specifics

`getCurrentUser()` (`src/lib/auth/server/getCurrentUser.ts`) is `React.cache()`-wrapped, so calling it multiple times within a single server render is free. It returns the raw Supabase `User` — fetch `account` and `role` separately when you need them. There is no enriched "current user" object; build one in `src/lib/auth/server/` if you find yourself doing the same lookup repeatedly.
