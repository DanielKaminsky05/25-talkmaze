# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Supabase (Postgres / Auth / Storage) + Stripe + LessonSpace (external video) + Resend (transactional email) + Tiptap (rich text). 260 TS/TSX files under `src/`. Package manager: npm.

**Path alias:** `@/*` resolves to the repo root (see `tsconfig.json`). Imports look like `@/src/lib/...` — note the explicit `src/`.

## Commands

```bash
npm run dev              # next dev (http://localhost:3000)
npm run build            # next build
npm run start            # next start
npm run lint             # eslint (custom layering rules enforced — see below)
npm run gen-types        # regenerate src/services/supabase/types/database.ts from project zfnmverkmybrasrwhjyg
npm run test:unit        # vitest unit tests (no DB needed, ~10s)
npm run test:integration # vitest integration tests (requires supabase start + .env.test, ~60s)
npm run test:coverage    # unit tests with v8 coverage report
```

No Prettier/formatter beyond ESLint. The Supabase project ID is hard-coded into the `gen-types` script. Integration tests require a local Supabase instance (`supabase start`) and a `.env.test` file — see `docs/testing-coverage.md`.

CI runs both test suites automatically on every push and PR via `.github/workflows/test.yml`. Unit tests run unconditionally; integration tests are skipped on draft PRs.

## Architecture — the load-bearing pieces

### Route groups under `src/app/`

- `(public)/` — `login`, `signup`, `forgot-password`, `reset-password`, `payments` (the paywall and checkout flow lives here intentionally because students can hit it before having an `active_profile_*` cookie).
- `(protected)/` split by audience:
  - `(families)/` — student/parent-facing: `lessons`, `message`, `onboarding`, `parent`, `profiles`, `reward`, `student`. Wrapped in `ActiveProfileProvider` and `PageTitleProvider`.
  - `admin/`, `coach/` — role-specific dashboards.
- `api/` — REST handlers grouped by audience (`admin/`, `coach/`, `parent/`, `user/`, `profiles/`, `attendance/`, `checkout/`, `subscriptions/`, `lesson-progress/`, `webhooks/{stripe,lessonspace}`).

Route collocation conventions (underscore-prefixed = route-private, not routed by Next): `_components/`, `_hooks/`, `_context/`, `_types/`, plus `actions.ts` for route-scoped server actions, and Next's standard `loading.tsx` (always renders `<PageSpinner />`). Full convention also in `README.md`.

### Auth + access control (`src/middleware.ts` is critical)

Two layers run on every request:

1. **`updateSession()`** (`src/lib/auth/server/middleware/updateSession.ts`) — refreshes the Supabase auth cookie via `getClaims()`, redirects logged-in users away from `/login` and logged-out users away from anything that isn't `/`, `/login`, `/signup`, or `/auth`. **Do not insert logic between `createServerClient` and `getClaims()`** — the comment in the file calls out random logouts as the failure mode.
2. **RBAC + profile gating** (in `middleware.ts` itself) using `account.role` numeric codes:
   - `1` = regular user (parent/student family), `2` = coach, `3` = admin.
   - Coaches/admins hitting `/profiles` get bounced to their own dashboard. Non-coaches hitting `/coach` and non-admins hitting `/admin` get bounced to `/student`.
   - Regular users must have **both** `active_profile_id` and `active_profile_type` cookies. Missing them → `/profiles`. An `active_profile_type === "student"` user without an `active` row in `student_subscriptions` → `/payments`.
3. **`/api/webhooks/stripe` and `/api/webhooks/lessonspace` bypass both layers** (signature-verified instead). When adding webhook routes, exempt them in both `updateSession` and `middleware.ts`.

The active-profile cookies (`active_profile_id`, `active_profile_type` ∈ {`"student"`, `"parent"`}) are httpOnly, `secure` only in production, `sameSite: lax`. They're set by `selectProfile` (`src/lib/profiles/actions/selectProfile.ts`), which validates parent `profile_access_pin` if one is set. Server reads via `getActiveProfile()`; clients read via `useActiveProfile()` from `ActiveProfileContext`.

### Three Supabase clients — pick the right one

In `src/services/supabase/`:

- **`client.ts`** — `createClient()` browser client (publishable key). Use in Client Components.
- **`server.ts`** — `createClient()` server client wired to Next cookies. Use in Server Components, Route Handlers, and Server Actions. Default choice on the server.
- **`service.ts`** — `createServiceRoleClient()` bypasses RLS. **Only legitimate use is in webhooks** (Stripe / LessonSpace handlers, where there's no user session). Several admin routes use it as a shortcut to skip auth — that's a bug, not a pattern (see `docs/repo-quality-audit.md`).

`Database` types come from `src/services/supabase/types/database.ts` (generated — do not hand-edit; run `npm run gen-types`). 25 tables; map in `docs/data-model.md`.

### Layering rules (enforced by ESLint — see `eslint.config.mjs`)

- Nothing under `src/**` may import from `@/src/app/api/**`. API route handlers are HTTP endpoints, not a shared module. Put shared logic in `src/lib/<domain>/` and import that from both the route and any UI that needs it. (The rule is one-directional: routes can freely import from `src/lib/**`.)
- `src/services/lessonspace/**` is a pure provider adapter: cannot import from `@/src/lib/**`, `@/src/services/supabase/**`, or `@supabase/*`, and an AST rule forbids calling `.from(...)` (no DB access). Same spirit applies to other adapters in `src/services/` — keep them HTTP/SDK only.

### `src/lib/<domain>/` layout

Domains: `auth`, `coach`, `lessons`, `lessonspace`, `messaging`, `payments`, `profiles`, `scheduling`. Each contains:

- `actions/` — named server actions (one export per file, file named after the action).
- `server/` — server-only helpers that aren't actions.
- `types.ts`, `schemas.ts` — per-domain types and Zod schemas (Zod is installed but currently used in only one schema file; expand its usage rather than reinventing validation).

Business workflows live here and call into `src/services/*`. Don't reverse the direction. `getCurrentUser()` in `src/lib/auth/server/` is `cache()`-wrapped, returns the raw Supabase `User` (not enriched), and is the standard auth entry point inside routes/actions.

### Domain flows (read these before touching the related code)

- **Signup → onboarding → payment → matchmaking** has a deliberate lazy chain: signup creates `account` + `parents` + a placeholder `students` row only; the Stripe `customer` is created lazily in `/api/checkout`; the LessonSpace room is provisioned only after `invoice.paid` fires. Sessions/coach assignment happen inside the Stripe webhook via `assignCoachToStudent()` (or from onboarding once `student_availabilities` are set and `sessions_remaining > 0`). Full flow in `docs/data-model.md` + `docs/payments-flow.md`.
- **Matchmaking** — `assignCoachToStudent()` shuffles the student's weekly slots, generates candidate 1-hour starts on 10-min boundaries, checks the coach's and student's `booked_slots.status = "active"` rows and the `sessions` table for conflicts, then writes a `booked_slots` row as `pending` with `num_sessions` + `start_date`. **Pending slots do not block matchmaking** — only `active` does. Admin approval (`approvePendingBookedSlot`) materialises individual `sessions` rows weekly (with a hard cap of `num_sessions * 3` weeks to bound the search), flips the slot to `active`, and idempotently inserts a `coach_students` link. DST is handled by re-anchoring wall-clock time per week in the slot's timezone, not by adding UTC weeks. Algorithm in `docs/matchmaking.md`.
- **Stripe subscriptions** support upgrade/downgrade via Stripe `SubscriptionSchedule` (`/api/subscriptions/schedule` + `setup_intent.succeeded` webhook). Two-phase schedule keeps the old plan until period end, then transitions; `pending_plan_id` + `pending_stripe_schedule_id` track it on `student_subscriptions`. Refund window is 28 days from `current_period_start` (hard-coded in `src/lib/payments/server/policies.ts`). `docs/payments-flow.md` has the full lifecycle.
- **LessonSpace** — student room is provisioned once with webhooks enabled (`students.webhook_room_id` is the join key). Subsequent launches just regenerate participant URLs without webhooks. Incoming webhooks at `/api/webhooks/lessonspace` look up the student by `webhook_room_id`. Layer map in `docs/lessonspace-runtime-flows.md`.

### Conventions

- **Validation:** Zod is mostly absent from API routes; when you touch a route, add a Zod schema for its body instead of duplicating manual `typeof` checks. Collocate route-only schemas; promote to `src/lib/<domain>/schemas.ts` once shared.
- **Date/time:** `src/utils/formatDateTime.ts` exposes `fmtUtcTime/Date` for UTC sources (DB ISO strings) and `fmtLocalTime/Date` for client display. Recurring availability is stored as `weekday` + `HH:mm:ss` + `timezone` (not UTC); reinterpret per-date when materialising.
- **Names:** `fullName(first, last, fallback)` in `src/utils/formatName.ts`. First-last order, no titles.
- **Rich text:** Tiptap with `StarterKit` (`bold`, `bullet`/`ordered` lists only — no headings/blockquotes/code). Storage is raw HTML; render via `RichTextDisplay` which runs DOMPurify. Both live in `src/components/common/rich-text/`. `immediatelyRender: false` is required for SSR.
- **UI styling:** Tailwind v4 CSS-only config (`@import "tailwindcss"` in `globals.css`). Custom palette is in CSS variables — primary `#2B4257`, content bg `#1f2e3b`, accent `#B1E7D6`. Font is **Roboto** via `next/font` (the `next/image` allowlist in `next.config.ts` covers the Supabase storage host only).
- **Loading:** `loading.tsx` files return `<PageSpinner />`; no skeleton pattern.
- **Calendars:** FullCalendar (dayGrid + timeGrid + interaction). Wrappers force remount with `key={`${initialView}-${initialDate}`}` to work around plugin state issues.
- **Icons:** Local SVGs barreled from `src/components/ui/icons/index.ts`. `lucide-react` is also available and used sparingly.

### Known quality issues (don't propagate when editing)

Full audit with file paths and severities in `docs/repo-quality-audit.md`. Headline items:

**Critical**
- `create-admin/route.ts` has its RBAC check commented out — any authenticated user can grant admin.
- **17 `/api/admin/**` routes have no auth at all**; the 4 `pending-bookings` routes also bypass RLS via `createServiceRoleClient()`. Add `getCurrentUser()` + `account.role === 3` whenever you touch one of them.
- `parent/students/[studentId]` and `coach/lessonspace/[coachId]/[studentId]` accept IDs from the URL with no auth check.
- The LessonSpace webhook (`/api/webhooks/lessonspace`) accepts any POST — no signature verification — and emails the lesson summary to a hardcoded `wdstalkmaze@gmail.com` instead of the resolved account email.
- `/api/checkout` accepts a `password` field, `console.log`s it, and stores it in Stripe subscription metadata. Stripe metadata is visible in the dashboard.
- Coach routes (`lesson-feedback`, `lesson-progress`, `lesson-tasks`, `lessons`, `sessions`, `conversation`) authenticate the user but never check that the `studentId` they're acting on belongs to the calling coach. Use the `coach_students` join.

**High**
- `src/lib/scheduling/server/matchmaking.ts` has nested loops that re-query `booked_slots` and `sessions` inside the innermost iteration — pre-fetch and build an in-memory conflict map.
- N+1 in `app/(protected)/(families)/message/[id]/page.tsx` (and the equivalent `api/coach/conversation/message/route.ts`) — fetch sender profiles with a relational `select()` join instead of mapping per-message.
- God components: `admin/courses/_components/CourseLessonPanel.tsx` (1215 lines, 28 `useState`), `parent/profile/_components/ParentProfilePageClient.tsx` (767 lines, 26 `useState`), `coach/students/.../LessonDetailClient.tsx` (718 lines), `student/profile/_components/StudentProfilePageClient.tsx` (633 lines). (The old "`admin/page.tsx` is 1700 lines" claim is stale — admin has been split.)
- Cross-route private import: `coach/_components/StudentDetails.tsx` imports `ConversationClient` from `(families)/message/[id]/_client`. Promote to `src/lib/messaging/` or `src/components/`.
- Half-finished `coach_availabilities` / `student_availabilities` column migration: the new `start_time_new`/`end_time_new` columns coexist with the legacy `start_time`/`end_time`. The two parent/admin availability GET routes still read the legacy columns only.

**Medium**
- Zod is installed but used in only ~4 places (signup, onboarding, two profile-setup pages) — every API body is validated by ad-hoc `typeof` checks. When you touch a route, add a schema.
- `as any` casts cluster in `coach/lesson-progress/route.ts` (5 instances) and the parent lesson pages. The lesson-progress casts suggest the generated DB types are out of sync — consider regenerating via `npm run gen-types`.
- Inconsistent error shapes: `{ error }` vs `{ message }` vs `{ status, message }` (sometimes with the HTTP status not actually set on the response). Standardise on `{ error: string }` with `NextResponse.json(body, { status })`.
- ~21 stray `console.log`/`console.error` calls (notably one logging the user's password in `/api/checkout`) and 14 `alert()` calls for user-facing errors.
- `src/app/api/admin/courses/assign/route.ts` builds a `.not()` filter via string concatenation — SQL injection shape.

**Cruft**
- Modals lack `role="dialog"` / `aria-modal` and most icon-only buttons lack `aria-label`.
- `ReviewLesson.tsx` and `UpNextLesson.tsx` are 44-line near-duplicates — merge.
- Stale `tw_id` comments and a no-op `resolveCoachUUID()` stub in `api/admin/employees/[id]/availability/route.ts`. `students.teach_works_url` column still exists but is unused — drop next migration.

### Supporting docs

- `docs/data-model.md` — full table inventory and entity graph (created here).
- `docs/payments-flow.md` — Stripe checkout → invoice → schedule lifecycle (created here).
- `docs/api-conventions.md` — per-route auth/validation patterns and the service-role audit (created here).
- `docs/matchmaking.md` — coach/student matching algorithm.
- `docs/lessonspace-runtime-flows.md` — LessonSpace integration map.
- `docs/repo-quality-audit.md` — known issues.
- `docs/testing-strategy.md` — testing framework choices, tooling decisions, per-domain test catalogue, phased rollout plan.
- `docs/testing-coverage.md` — **current test coverage state**: what's written, what's passing/failing, what still needs to be done, key patterns and gotchas.
- `README.md` — original route collocation conventions.
