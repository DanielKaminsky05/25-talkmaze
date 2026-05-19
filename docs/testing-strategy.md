# Testing Strategy

Groundwork for going from zero tests to a useful safety net. This doc is opinionated about what to test, in what order, with which tools, and — equally important — what *not* to test yet.

## Goals & non-goals

**Goals**
1. Lock down the security and authorization gaps documented in `repo-quality-audit.md` so they cannot regress once fixed.
2. Pin the behaviour of `src/lib/scheduling/server/matchmaking.ts` and `src/lib/payments/server/policies.ts` — the densest pure logic in the repo and the highest-stakes business rules.
3. Make webhook handlers (Stripe + LessonSpace) safe to refactor by replaying fixture payloads.
4. Establish a test harness future contributors can extend without re-litigating tooling choices.

**Non-goals (for now)**
- **Component-internal** unit tests against god components scheduled for refactor (`CourseLessonPanel.tsx`, the two profile clients, `LessonDetailClient.tsx`) — tests against their `useState` hooks, props shapes, or rendered JSX get thrown away the moment the components get broken up. **But journey-level tests against these components ARE in scope and should land BEFORE the refactor** — see "Pre-refactor characterisation tests" below.
- Snapshot tests of any kind. They mostly assert that nothing changed; they don't tell you whether what changed is correct.
- 100% coverage. Coverage is a side effect, not the target. Aim for *every documented critical and high-severity issue has a regression test*; everything else is opportunistic.
- A staging environment, performance tests, load tests, or chaos tests. Out of scope.

---

## Test layers (the pyramid, with concrete shapes)

Four layers, written in this order of priority:

### 1. Unit tests — pure logic, no I/O

Target: functions in `src/lib/<domain>/server/**` that take inputs and return outputs without touching the network or DB. The Supabase client is the only external dependency we'll stub.

Examples in scope: matchmaking algorithm internals, refund policy, profile cookie helpers, the availability time-format conversions, fullName/formatDateTime utilities.

Cost: milliseconds per test. Should run on every save.

### 2. Integration tests — API routes + server actions against a real local Supabase

Target: every API route under `src/app/api/` and every `actions.ts` server action. A real Postgres runs locally (Supabase CLI Docker stack). External providers (Stripe, LessonSpace, Resend) are mocked via MSW. Auth state is set up by signing a real Supabase session for a seeded user.

Examples: "regular user calls `/api/admin/create-admin` and gets 403", "Stripe `invoice.paid` webhook upserts `student_subscriptions` correctly", "approval of a pending booked slot creates exactly `num_sessions` `sessions` rows".

Cost: hundreds of milliseconds per test. Run on PR.

### 3. Contract / fixture-replay tests — webhooks

Special-case integration tests where the input is a **real** captured webhook payload (signed with the test webhook secret) and the assertion is on DB side effects. These catch the bugs that fail silently in prod because nobody is watching the webhook return code.

Cost: same as integration but warrants a separate folder because the inputs are static JSON fixtures.

### 4. E2E tests — Playwright, golden paths only

Target: one or two user journeys end-to-end with the actual Stripe test-mode flow. Examples: signup → checkout (with test card `4242…`) → onboarding → first lesson; admin login → approve pending booking.

Cost: seconds per test. Run on main + nightly. **Phase 4 — don't start here.**

The pyramid is deliberately skewed toward layer 2. Most SaaS production bugs are integration bugs (three pieces didn't talk to each other right), not algorithm bugs.

---

## Framework choices

| Concern | Pick | Why |
|---|---|---|
| Test runner | **Vitest** | ESM-native, TS works without ts-jest, watch mode is fast, drop-in `describe`/`it`/`expect`. Jest needs babel-jest or ts-jest, and ESM with Next 16 + React 19 is painful. |
| Local Postgres | **Supabase CLI** (`supabase start`) | Brings up Postgres + GoTrue + Realtime + Storage in Docker, matching the prod schema via your migrations. No need to mock RLS — it runs for real. |
| HTTP mocking (Stripe SDK, LessonSpace, Resend) | **MSW** (Mock Service Worker) | Intercepts at the network layer, so adapter code under `src/services/` runs unchanged. Mocks survive refactors of how the SDK is called. |
| Stripe webhook signing | `stripe.webhooks.generateTestHeaderString` (built into the SDK) | Produces a valid signature against your test `STRIPE_WEBHOOK_SECRET` so fixture replays go through the same `constructEvent` code path as prod. |
| E2E | **Playwright** | Parallel by default, traces on failure, first-class TS, ships its own browsers. Cypress is the alternative but its parallelism story is worse and its async model surprises devs. |
| Coverage | **Vitest's `--coverage` (v8 provider)** | Built-in, no extra deps. Don't gate PRs on a coverage number — gate on the audit's regression tests existing. |
| CI | **GitHub Actions** | `supabase/setup-cli` + Docker layer caching is enough. |

Versions to pin: `vitest@^2`, `@playwright/test@^1.47+`, `msw@^2`, `supabase` CLI matching the repo's existing dep.

---

## Project structure

```
tests/
  unit/
    scheduling/
      matchmaking.test.ts
      availability.test.ts
    payments/
      policies.test.ts
    profiles/
      profileCookies.test.ts
    utils/
      formatDateTime.test.ts
      formatName.test.ts
  integration/
    middleware/
      auth-redirects.test.ts
      profile-gating.test.ts
      role-routing.test.ts
    api/
      admin/
        create-admin.test.ts
        create-coach.test.ts
        students.test.ts
        pending-bookings.test.ts
        ... one per route family
      coach/
        lesson-progress.test.ts
        lesson-feedback.test.ts
        lessonspace.test.ts
        sessions.test.ts
        conversation.test.ts
      parent/
        students.test.ts
        availability.test.ts
      subscriptions/
        cancel.test.ts
        schedule.test.ts
        resume.test.ts
      checkout.test.ts
      attendance.test.ts
      profiles-select.test.ts
    actions/
      onboarding.test.ts
      selectProfile.test.ts
      sendMessage.test.ts
      getLessonSpace.test.ts
  contract/
    webhooks/
      stripe.invoice-paid.test.ts
      stripe.subscription-deleted.test.ts
      stripe.setup-intent-succeeded.test.ts
      stripe.invoice-payment-paid.test.ts
      stripe.signature.test.ts
      lessonspace.session-summary.test.ts
  e2e/                              # Phase 4 only
    signup-to-first-lesson.spec.ts
    admin-approve-booking.spec.ts
  fixtures/
    stripe/
      invoice.paid.json
      customer.subscription.deleted.json
      setup_intent.succeeded.json
      invoice_payment.paid.json
    lessonspace/
      session-summary.json
  helpers/
    db.ts            # truncate, seed migrations
    factories.ts     # createTestAccount/Coach/Student/Plan/Subscription/...
    auth.ts          # signSessionFor(userId) → cookie string
    stripe.ts        # signWebhook(fixture, secret) → signed request body+header
    msw.ts           # bootstrap handlers for LessonSpace + Resend
    request.ts       # call(routeHandler, { method, body, cookies }) helper
  setup/
    global-setup.ts  # spin up Supabase, run migrations
    test-setup.ts    # per-test DB reset
vitest.config.ts
playwright.config.ts  # added in Phase 4
.env.test            # test-mode keys; gitignored if it has real secrets
```

**Naming.** `.test.ts` for vitest, `.spec.ts` for Playwright. The split makes it trivial to run one tier (`vitest run tests/unit`, `playwright test`).

**Isolation strategy.** Truncate all tables between tests (`TRUNCATE … RESTART IDENTITY CASCADE`), then seed via factories. Single Postgres, single worker for the integration suite at first — parallelize later by giving each worker its own schema or DB. Avoid transaction-rollback wrappers: Supabase auth uses its own pooled connections and the abstraction leaks.

**Auth fixture pattern.** `helpers/auth.ts` exposes `signSessionFor({ role, accountId })` which mints a real Supabase JWT signed by the local GoTrue secret and returns it as a cookie header. Tests then do `call(routeHandler, { cookies: sessionCookie })` to exercise middleware + handler together.

---

## Per-domain test catalogue

This section is the meat. For each domain it lists the test cases that should exist. Cases marked **(audit)** are direct regression tests for issues documented in `repo-quality-audit.md` — write these first.

### Matchmaking (`src/lib/scheduling/server/matchmaking.ts`) — unit

`assignCoachToStudent(studentId, numSessions)`:
- Happy path: one student slot, one matching coach with overlapping availability → one `pending` `booked_slots` row written with the matched weekday, start_time, num_sessions.
- No coach with matching weekday → returns failure result, zero DB writes.
- Coach is available but has an `active` `booked_slots` row that overlaps → that coach is skipped; falls through to the next coach.
- Student has an `active` `booked_slots` row that overlaps a candidate start time → that start is skipped.
- A `pending` (not `active`) `booked_slots` row exists for the candidate coach + time → **does not** block; documents this exact contract from `matchmaking.md`.
- Student has multiple availability slots, only the third one has a coach → second-pass success; shuffle determinism asserted by seeding `Math.random`.
- Coach + student in different timezones (PT student, ET coach): 1pm PT = 4pm ET should match a 4pm ET coach window.
- **DST forward transition**: student slot Sunday 02:30 America/New_York for 6 weeks where week 3 crosses the spring-forward boundary → all 6 candidate start times keep wall-clock 02:30 in NY, not UTC-advanced. Use `vi.setSystemTime` to anchor.
- **DST backward transition**: same setup, fall-back side.
- Empty `student_availabilities` → failure, no writes.
- Empty `coach_availabilities` → failure.
- Numeric stability of shuffle: run 100 iterations, assert that no single weekday gets > 40% of placements (load-balance property from `matchmaking.md`).

`approvePendingBookedSlot(bookedSlotId)`:
- Generates exactly `num_sessions` rows in `sessions` with correct UTC ISO timestamps.
- Skips a week where `sessions` already has a coach conflict; emits the next available week instead.
- Skips a week where `sessions` already has a student conflict (e.g. student rescheduled into that slot).
- **Hard cap**: when conflicts force the search past `num_sessions * 3` weeks, returns failure rather than infinite-looping.
- Flips `booked_slots.status` from `"pending"` to `"active"`.
- Inserts the `(coach_id, student_id)` row into `coach_students` exactly once even if called twice (idempotency / `onConflict`).
- DST spans two transitions inside one approval window → all generated session times preserve wall-clock.
- `hasActiveBookedSlotConflict()` is hit before any writes — assert no `sessions` rows on conflict path.

`hasActiveBookedSlotConflict(...)`:
- Same coach, same weekday, overlapping minute → true.
- Same coach, same weekday, adjacent (10:00–11:00 vs 11:00–12:00) → false.
- Same coach, different weekday → false.
- Different coach → false (caller specifies which entity to check).
- Status `"pending"` → false (must be `"active"` to count).

### Payments policies (`src/lib/payments/server/policies.ts`) — unit

- Within 28 days of `current_period_start` → refundable.
- Exactly 28 days → boundary (decide and pin: inclusive vs exclusive; the test documents the choice).
- 29 days → not refundable.
- `current_period_start` in the future → guard returns not refundable.
- `null` `current_period_start` → guard returns not refundable (don't crash).
- Use `vi.useFakeTimers()` to fix "now"; do not rely on real clock.

### Auth + middleware (`src/middleware.ts` + `updateSession.ts`) — integration

- Unauthenticated GET `/student` → 307 redirect to `/login`.
- Unauthenticated GET `/api/webhooks/stripe` → 200 (or whatever the handler returns); middleware MUST NOT redirect.
- Unauthenticated GET `/api/webhooks/lessonspace` → same.
- Authenticated regular user GET `/login` → redirect to `/profiles`.
- Coach (role=2) GET `/admin` → redirect to `/student`.
- Coach GET `/profiles` → redirect to `/coach`.
- Admin (role=3) GET `/coach` → redirect to `/student`.
- Admin GET `/profiles` → redirect to `/admin`.
- Regular user (role=1) without `active_profile_id` cookie GET `/student` → redirect to `/profiles`.
- Regular user with `active_profile_type=student` cookie but no `active` `student_subscriptions` row → redirect to `/payments`.
- Regular user with `active_profile_type=student` + active subscription → 200 on `/student`.
- Regular user with `active_profile_type=parent` and no subscription → 200 on `/parent` (parent type bypasses the subscription gate per the current middleware).
- `/onboarding` is reachable by a regular user with no active profile → asserts the carve-out in the middleware.

### API auth + ownership (the audit's CRITICAL findings as regression tests)

The pattern for every one of these: seed a user with a specific role, call the route, assert HTTP status AND assert DB side effects (or absence).

`/api/admin/create-admin` POST:
- **(audit)** Regular user → 403, no `account` row created.
- **(audit)** Coach → 403.
- Admin → 200, new admin account exists with `role=3`.
- Missing required body fields → 400 (not 500).

`/api/admin/create-coach` POST:
- Regular user → 403.
- Coach → 403.
- Admin → 200; `coaches` row created.

`/api/admin/students` GET, `/api/admin/employees` GET, `/api/admin/courses` GET/POST, `/api/admin/courses/[id]` PUT/DELETE, `/api/admin/courses/[id]/lessons[/lessonId]` …, `/api/admin/courses/assign` GET/POST, `/api/admin/employees/[id][/availability]` …, `/api/admin/payment-plans[/id][/archive]` …, `/api/admin/students/[id]` PUT, `/api/admin/students/lessons/[studentId]` GET, `/api/admin/assignments[/id]` …:
- **(audit)** Unauthenticated → 401.
- **(audit)** Regular user → 403.
- **(audit)** Coach → 403.
- Admin → 200, expected side effect occurred.

`/api/admin/pending-bookings[/id][/approve|/preview]`:
- **(audit)** Unauthenticated → 401.
- **(audit)** Regular user → 403.
- **(audit)** Admin → 200.
- Also: when the route is fixed to stop using `createServiceRoleClient()`, RLS must permit admins to read — add an RLS test that runs the same query via the user-scoped client and verifies it returns rows.

`/api/parent/students/[studentId]` GET:
- **(audit)** Unauthenticated → 401.
- **(audit)** Caller authenticated but `students.account_id !== caller.id` → 403 (or 404 to avoid enumeration; pick and pin).
- Caller is the student's parent → 200, returns the expected fields.
- Response uses correct HTTP status code, not 200 with `{status:404}` in body.

`/api/coach/lessonspace/[coachId]/[studentId]` GET:
- **(audit)** Unauthenticated → 401.
- **(audit)** Regular user → 403.
- **(audit)** Coach whose `account_id !== coachId` → 403.
- **(audit)** Coach who is not in `coach_students` for that student → 403.
- Coach who owns the relationship → 200, returns a LessonSpace URL; assert MSW saw the outbound `/v2/spaces/launch/` call.

Coach routes that authenticate but don't verify ownership — `/api/coach/lesson-feedback` PATCH, `/api/coach/lesson-progress` PATCH, `/api/coach/lesson-tasks` PATCH, `/api/coach/lessons` GET, `/api/coach/sessions` GET, `/api/coach/sessions/[id]` PATCH, `/api/coach/conversation` GET, `/api/coach/conversation/message` GET:
- **(audit)** Coach not in `coach_students` for the target `studentId` / not the coach of the target `sessionId` → 403.
- Coach who owns the relationship → 200, side effect applied.

### Checkout & subscriptions

`/api/checkout` POST:
- **(audit)** Body contains `password` field → after the security fix, this field is rejected/ignored. Until then, write the test asserting current behaviour and tag it `// REGRESSION: remove password handling`.
- New user flow (`studentIdOverride === "new"`): creates Stripe customer lazily (MSW captures the call); creates subscription in `incomplete` state with metadata.
- Existing user, `studentId` belongs to caller → 200, subscription created.
- Existing user, `studentId` belongs to someone else → 403.
- Orphaned `incomplete` subscriptions for the same student are cancelled before the new one is created.
- Stripe customer already exists on `account.stripe_customer_id` → reused, not recreated.

`/api/subscriptions/cancel` POST:
- Within 28 days → refund issued (MSW asserts `stripe.refunds.create` was called), `status="cancelled"`, `cancelled_at` set.
- After 28 days → `cancel_at_period_end=true` on Stripe, `status` stays `"active"`, `cancelled_at` recorded as scheduled.
- Caller is not the subscription's owner → 403.
- No active subscription → 404.

`/api/subscriptions/resume` POST:
- Subscription with `cancel_at_period_end=true` → cleared on Stripe, DB unchanged otherwise.
- Subscription with `cancel_at_period_end=false` → 400 / no-op (pin behaviour).

`/api/subscriptions/schedule` POST:
- Creates SetupIntent with `{target_price_id, stripe_subscription_id}` metadata.
- Caller does not own the subscription → 403.

`/api/subscriptions/schedule/cancel` POST:
- Existing `pending_stripe_schedule_id` → schedule released on Stripe, `pending_*` fields cleared.
- No pending schedule → 400.

### Stripe webhook contract tests (`/api/webhooks/stripe`)

Capture fixtures once from a real Stripe test-mode event (or use `stripe trigger` and pipe to file). Sign each fixture with the local `STRIPE_WEBHOOK_SECRET` using `stripe.webhooks.generateTestHeaderString` before POSTing.

`invoice.paid` (first payment):
- Creates `student_subscriptions` row with `status="active"`, `current_period_start/end` from the invoice, `sessions_remaining = plan.classes`.
- Calls the internal `/api/webhooks/stripe/learningSpace` route (MSW captures the call, or stub the LessonSpace HTTP layer).
- Calls `assignCoachToStudent(student_id, plan.classes)` → assert a `pending` `booked_slots` row appears, or — if the comment about "first payment skips assignment" is the intended behaviour — assert that it does NOT. **The audit flagged this as inconsistent; the test pins one interpretation.**

`invoice.paid` (renewal of existing subscription):
- Updates `current_period_start/end` and resets `sessions_remaining`.
- Always calls `assignCoachToStudent`.

`customer.subscription.deleted`:
- Marks `student_subscriptions.status = "cancelled"`.
- Idempotent: replaying the event leaves DB state unchanged.

`setup_intent.succeeded` (upgrade/downgrade):
- Creates a two-phase `SubscriptionSchedule` (MSW captures call), stores `pending_plan_id`, `pending_stripe_schedule_id`, `pending_effective_date`, `pending_created_at`.
- If a prior schedule existed, it's released first; release failure is logged but doesn't abort.

`invoice_payment.paid` (phase transition):
- Activates the pending plan: `plan_id ← pending_plan_id`, clears all `pending_*`.
- Calls `assignCoachToStudent` again.

Signature handling:
- Tampered body, valid signature for original body → 400.
- Missing `stripe-signature` header → 400.
- Replay of an event whose `event.id` was processed yesterday → second invocation is a no-op (this requires either an idempotency log or Stripe API check — the test documents whichever you implement; right now there is none, so the test should expose that gap).

API-version drift safety:
- Invoice payload in the old shape (lacks new fields) → handler still processes correctly. The `as any` casts in `route.ts` lines ~242, ~349 exist for this reason; the test pins their behaviour so the casts can be removed safely later.

### LessonSpace webhook (`/api/webhooks/lessonspace`)

- **(audit)** Unsigned POST is currently accepted — write the test that documents the gap and mark it `// REGRESSION: enable once signature verification lands`.
- Once signed: invalid signature → 401.
- Valid signature, `body.room.id` matches a `students.webhook_room_id` → email sent via Resend (MSW asserts) **to the parent's email from `account.email`, not the hardcoded `wdstalkmaze@gmail.com`**. This is the test that catches the current hardcoded-recipient bug.
- Valid signature, `body.room.id` matches no student → 404, no email sent.
- Body contains a `summary` → lesson summary email content includes the summary text and student first name.
- Body lacks a `summary` → no email; route returns 200.

### Profile selection (`src/lib/profiles/actions/selectProfile.ts`)

- Student profile owned by caller → cookies set (`active_profile_id`, `active_profile_type=student`), redirect to `/student`.
- Parent profile with no PIN → cookies set, redirect to `/parent`.
- Parent profile with PIN, wrong PIN → no cookies set, returns error.
- Parent profile with PIN, correct PIN → cookies set.
- Profile not owned by caller (different `account_id`) → 403.
- Profile id refers to a non-existent row → 404.
- Cookies are httpOnly + `sameSite=lax` + `secure` only when `NODE_ENV === "production"`.

### LessonSpace launch action (`src/lib/lessonspace/actions/getLessonSpace.ts`)

- Active profile type is `parent` → throws / returns error.
- Active profile is student but `students.lesson_space_id` is null → throws.
- Student with `lesson_space_id` → calls `createAndPersistStudentParticipantLink({includeWebhooks: false})` (MSW asserts `webhooks=false`).
- Returned `client_url` is what the action returns.

### Messaging (`src/lib/messaging/actions/sendMessage.ts`)

- Unauthenticated → throws.
- Empty body text → throws / 400.
- Authenticated user with student active profile → message inserted with `sender_id = user.id`; returned object has `sender.name` from `students` table.
- With parent active profile → sender name from `parents`.
- With no active profile → sender name from `coaches` (the fallback in the action).
- **Gap test (audit):** caller sends to a `conversation_id` they don't belong to — currently succeeds; write the failing test now to document the gap, skip with `it.todo` until the conversation-membership check lands.

### Profile cookies (`src/lib/profiles/server/profileCookies.ts`) — unit

- `setProfileCookies` writes both `active_profile_id` and `active_profile_type`.
- Cookies are httpOnly.
- `secure` flag respects `NODE_ENV`.
- `getActiveProfile` returns `{id, type}` when both cookies present, `null` when either is missing.

### Utility unit tests

`src/utils/formatDateTime.ts`:
- `fmtUtcTime("2026-05-19T15:05:00Z")` → `"3:05 PM"` regardless of test runner timezone.
- `fmtUtcDate` uses short weekday + month.
- `fmtLocalTime` reflects the runner's timezone (run with `TZ=America/New_York` and `TZ=UTC` in CI to catch regressions).

`src/utils/formatName.ts`:
- `fullName("Ada", "Lovelace")` → `"Ada Lovelace"`.
- `fullName(null, "Lovelace", "Anon")` → `"Lovelace"` (trim space).
- `fullName(null, null, "Anon")` → `"Anon"`.
- `fullName(null, null)` → `""`.

---

## Test helpers (the bits that make writing the above feasible)

### `tests/helpers/factories.ts`

```ts
export async function createAccount(overrides?: Partial<Account>): Promise<Account>;
export async function createParent(account: Account, overrides?: Partial<Parent>): Promise<Parent>;
export async function createStudent(account: Account, overrides?: Partial<Student>): Promise<Student>;
export async function createCoach(overrides?: Partial<Coach>): Promise<{account, coach}>;
export async function createAdmin(overrides?: Partial<Admin>): Promise<{account}>;
export async function createPlan(overrides?: Partial<Plan>): Promise<Plan>;
export async function createSubscription(student: Student, plan: Plan, overrides?: Partial<StudentSubscription>): Promise<StudentSubscription>;
export async function createBookedSlot(coach: Coach, student: Student, overrides?: Partial<BookedSlot>): Promise<BookedSlot>;
export async function createCoachAvailability(coach: Coach, day: number, start: string, end: string, tz?: string): Promise<CoachAvailability>;
export async function createStudentAvailability(student: Student, day: number, start: string, end: string, tz?: string): Promise<StudentAvailability>;
```

Each factory inserts via `createServiceRoleClient()` (the test bootstrap is allowed to bypass RLS) and returns the row. Sensible defaults; overrides for the specific behaviour under test.

### `tests/helpers/auth.ts`

```ts
export async function signSessionFor(account: Account): Promise<{ cookies: string }>;
export const ANON: { cookies: "" };
```

Mints a real Supabase JWT via `supabase.auth.admin.createUser` + `generateLink`, or simpler: insert directly into `auth.users` and create a JWT with the local instance's signing secret. Returns a cookie header string the test can pass to the route handler.

### `tests/helpers/request.ts`

```ts
export async function call(
  handler: (req: NextRequest, ctx: { params: Promise<any> }) => Promise<NextResponse>,
  opts: { method?: string; body?: unknown; params?: Record<string,string>; cookies?: string; query?: Record<string,string> }
): Promise<{ status: number; json: any; headers: Headers }>;
```

Lets a test do `const res = await call(POST, { body: {...}, cookies: session })` without standing up a Next server.

### `tests/helpers/stripe.ts`

```ts
export function signWebhook(payload: object, secret = process.env.STRIPE_WEBHOOK_SECRET_TEST!): { body: string; signature: string };
export async function postStripeEvent(fixturePath: string): Promise<Response>;
```

Loads a JSON fixture, signs it with the test secret, POSTs to `/api/webhooks/stripe`, returns the response. The fixture is the real Stripe event shape.

### `tests/helpers/db.ts`

```ts
export async function resetDb(): Promise<void>; // TRUNCATE ... RESTART IDENTITY CASCADE
export async function migrate(): Promise<void>; // run supabase migrations
```

Called from `beforeEach`. Cheap because Postgres is local and the dataset is tiny.

### `tests/helpers/msw.ts`

Default MSW handlers for `https://api.stripe.com/*`, `https://api.lessonspace.com/*`, `https://api.resend.com/*`. Each test can override per-call with `server.use(...)` to assert the outbound payload.

---

## Phased rollout

**Phase 1 (week 1) — unit tests + tooling.**
- Add `vitest`, `@vitest/coverage-v8`, set up `vitest.config.ts`.
- Write tests in `tests/unit/scheduling/matchmaking.test.ts` against the in-memory shape (stub the Supabase client). Cover all matchmaking and approval cases listed above.
- Write `tests/unit/payments/policies.test.ts` (refund window).
- Write `tests/unit/utils/*` (date, name).
- Add a GitHub Action that runs `vitest run --coverage` on every PR.
- **Deliverable:** ~40 unit tests, no DB infra needed, CI green.

**Phase 2 (week 2–3) — integration harness + audit regression tests.**
- Add `supabase` CLI to CI; bring up the stack in a setup script.
- Write `tests/helpers/{db,auth,factories,request,msw}.ts`.
- Write the middleware redirect tests.
- Write one regression test per audit-flagged auth hole. Each test seeds a user of the wrong role, calls the route, asserts the expected status. **These tests should fail today.** As the auth fixes land, they flip to green.
- **Deliverable:** a failing-then-fixed test set that gates re-introduction of every documented Critical-severity bug.

**Phase 3 (week 3–4) — webhook contract tests.**
- Capture fixtures: trigger each event type once against a Stripe test account, save the JSON.
- Write the Stripe webhook tests; pin the "first payment skips matchmaking" question one way or the other.
- Write the LessonSpace webhook tests (most start `it.todo` until signature verification ships, except the hardcoded-email regression test which can run today).
- **Deliverable:** webhook handlers safe to refactor without manually replaying Stripe events.

**Phase 4 (later) — E2E.**
- Playwright config; one signup → first lesson path; one admin approval path.
- Use Stripe test cards. Use real test-mode Stripe + real test-mode LessonSpace (or mock both at the network layer — preference: real Stripe test mode for the E2E only).
- Run on main, not on PR (slower).

**Pre-refactor characterisation work (parallel track, ad hoc).**
Before each god-component refactor PR, pull forward a small Playwright slice for that component's client-only journeys (see the "Pre-refactor characterisation tests" section above). Integration coverage for the same components comes for free from Phase 2.

---

## CI

`.github/workflows/test.yml`:

```yaml
name: test
on: [pull_request, push]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx vitest run tests/unit --coverage

  integration:
    runs-on: ubuntu-latest
    services:
      docker: { image: docker:dind }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase start
      - run: npm ci
      - run: npx vitest run tests/integration tests/contract
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.LOCAL_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.LOCAL_SERVICE_ROLE_KEY }}
          STRIPE_SECRET_KEY: sk_test_dummy
          STRIPE_WEBHOOK_SECRET: whsec_test_dummy
```

The "local anon / service role keys" are the static values the Supabase CLI prints on `supabase start` — they're not secrets, they're deterministic per-CLI-version, but storing them in secrets keeps the file clean.

Cache Docker layers for `supabase start` to keep the integration job under ~3 minutes.

---

## Conventions

- **One assertion focus per test.** Multi-assert is fine when asserting a tuple ("status 200 AND DB row exists AND outbound HTTP was called"), but each test should answer one question.
- **Arrange / act / assert blocks separated by blank lines.** No clever helpers that hide what's being set up — tests are the documentation.
- **Factories accept overrides; tests pass only the fields that matter.** A test that says `createSubscription(student, plan, { cancelled_at: new Date("2026-01-01") })` reads as "this is a subscription that was cancelled on Jan 1" — exactly what the test cares about.
- **Time is fixed.** `vi.useFakeTimers(); vi.setSystemTime(new Date("2026-05-19T12:00:00Z"))` at the top of any test that does date math. Date-dependent tests on a real clock will flake at midnight UTC.
- **No shared state between tests.** `beforeEach(resetDb)`. If two tests interact, they should be `describe` siblings sharing a `beforeAll`.
- **MSW assertions over function spies.** Assert "Stripe received POST /v1/subscriptions with body X" rather than "the stripe SDK method was called with Y" — the former survives SDK refactors.
- **`it.todo` for documented-but-unwritten cases.** Don't let "we'll get to it" rot into untracked gaps; `it.todo` shows up in test output as a permanent reminder.

---

## Pre-refactor characterisation tests (the god components)

The four files flagged in `repo-quality-audit.md` (`CourseLessonPanel.tsx` — 1215 lines, `ParentProfilePageClient.tsx` — 767, `LessonDetailClient.tsx` — 718, `StudentProfilePageClient.tsx` — 633) are scheduled for refactor. Refactoring without tests is faith-based — characterisation tests need to land **before** the split, not after.

The trick is to write tests at a granularity that survives the refactor. The rule:

> **Test the journey at the highest stable boundary the journey crosses.**

A journey through `CourseLessonPanel` (admin creates a lesson, uploads a PPTX, attaches a token, reorders, deletes) crosses the network boundary into `/api/admin/courses/[id]/lessons[...]`. The route shape is the stable contract; the component is the implementation. Tests at the route boundary survive any restructuring of the component.

### Mapping each god component to its journey tests

| God component | Journey it implements | Where to test it |
|---|---|---|
| `CourseLessonPanel.tsx` | Admin lists / creates / edits / deletes / reorders lessons; uploads slides (PPTX + slide-show URL); attaches token icons; toggles pre/post-lesson tasks. | **API integration** against `/api/admin/courses/[id]/lessons` (POST), `/api/admin/courses/[id]/lessons/[lessonId]` (PUT, DELETE). Already in Phase 2. Add Playwright for the drag-reorder + file upload UI behaviour that doesn't round-trip cleanly. |
| `ParentProfilePageClient.tsx` | Parent edits avatar, bio, location, phone, billing email, PIN. | **API integration** against `/api/parent/setup` (PATCH) + whatever profile-update server actions live in `(families)/parent/profile/actions.ts`. Add Playwright for the section-by-section save/cancel UX and PIN flow. |
| `StudentProfilePageClient.tsx` | Student edits their own profile fields. | API integration against the student profile server action in `(families)/student/profile/actions.ts`. Playwright for the section UX (mirrors parent profile). |
| `LessonDetailClient.tsx` | Coach marks lesson status, writes feedback (rich text), overrides per-student tasks, uploads task files. | **API integration** against `/api/coach/lesson-progress` (PATCH), `/api/coach/lesson-feedback` (PATCH), `/api/coach/lesson-tasks` (PATCH). Add Playwright for the Tiptap editor saving HTML and the file-upload clearance flag. |

**The good news**: most of these journeys are *already* in the Phase 2 audit-driven API tests, because the underlying routes need ownership-check regression tests anyway. Adding a few "happy path" integration tests alongside the auth-failure tests covers ~80% of each component's contract.

**The gap**: client-only behaviour that doesn't round-trip — form validation, optimistic UI, conditional rendering of nested sections, the drag-reorder UI, the rich text editor's HTML output. For these, pull a small number of Playwright tests forward from Phase 4.

### Workflow

For each god component, before the refactor PR is opened:

1. List the journeys (use the table above as a starting point, but read the component first).
2. Write integration tests for each journey's API calls. Run green.
3. Write 1–3 Playwright tests for client-only behaviour. Run green.
4. Open the refactor PR. The suite must stay green throughout — if a test breaks, the refactor changed user-visible behaviour and needs adjustment, not a test update.
5. After the refactor lands, the same tests still pass against the new structure. They become the long-term safety net.

### Anti-patterns to avoid even at the journey level

- Asserting against text content that's just a label ("Save", "Cancel"). Use `getByRole('button', { name: /save/i })`, but don't test that the word "Save" itself never changes — that's a copy concern, not a behaviour concern.
- Asserting against DOM structure (`.find('div > div > span')`). Use accessible roles.
- Asserting against Tailwind class names. Test behaviour, not styling.
- Snapshot tests at any level. They assert "nothing changed" without telling you whether the change was correct.

## What NOT to test (yet)

- Component-internal state, props shapes, or JSX structure of any component. Test journeys (above), not implementations.
- UI rendering details like layout, spacing, colour, or Tailwind classes.
- Snapshot tests of any kind.
- Auto-generated `database.ts` — it has no logic.
- Adapter code in `src/services/*` that's purely a HTTP/SDK shim — the integration tests using MSW already cover it.

---

## Open questions to resolve before Phase 2 or before each god-component refactor

1. **Auth fixture mechanism.** Decide between (a) inserting directly into `auth.users` + crafting a JWT with the local GoTrue secret, or (b) using `supabase.auth.admin.createUser` + `signInWithPassword`. (a) is faster but couples to GoTrue internals; (b) is slower but provider-agnostic. Lean (a) for speed.
2. **"First payment skips matchmaking" intent.** The audit flagged the inconsistency between the comment in `/api/webhooks/stripe/route.ts` and the actual code. Decide which behaviour is correct *before* writing the webhook test, so the test pins the right thing.
3. **Refund-window boundary** (inclusive of day 28 or exclusive). Policy decision, then unit test follows.
4. **Conversation-membership check in messaging.** Audit calls out the gap. Pick: enforce now (test passes) or document gap (test is `it.todo`).
5. **Idempotency for Stripe webhooks.** No event-ID log table exists. Decide whether to add one or rely on per-event idempotent SQL; the test for "replay same event" follows that decision.
