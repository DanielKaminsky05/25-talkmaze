# Testing Coverage

Current state of the test suite as of May 2026. For the overall strategy, tooling decisions, and test catalogue see `docs/testing-strategy.md`.

---

## Headline numbers

| Layer | Files | Tests | Passing | Failing | Todo |
|---|---|---|---|---|---|
| Unit | 5 | 83 | 83 | 0 | 0 |
| Integration | 22 | 268 | 146 | 117 | 5 |
| **Total** | **27** | **351** | **229** | **117** | **5** |

The 117 failing integration tests are **intentional** — they document audit bugs (routes with no auth, security gaps, missing ownership checks). They are **not** broken tests. They turn green as fixes land.

---

## Unit tests (all green)

Run with `npm run test:unit`.

| File | What it covers | Tests |
|---|---|---|
| `tests/unit/scheduling/matchmaking.test.ts` | `assignCoachToStudent` happy path, no-coach, conflict skipping, pending-slot contract, timezone math, DST forward/back, shuffle load-balance | 26 |
| `tests/unit/payments/policies.test.ts` | `isWithinRefundWindow` — boundary, inside, outside, future date, null guard | 10 |
| `tests/unit/utils/formatDateTime.test.ts` | `fmtUtcTime/Date`, `fmtLocalTime/Date` across timezones and edge cases | 19 |
| `tests/unit/utils/formatName.test.ts` | `fullName` — nulls, whitespace, fallback | 13 |
| `tests/unit/profiles/profileCookies.test.ts` | `setProfileCookies`, `getActiveProfile`, httpOnly flag, `secure` in production only | 17 |

---

## Integration tests

Run with `npm run test:integration`. Requires `supabase start` and a valid `.env.test`.

### Middleware (`tests/integration/middleware/`)

**`redirects.test.ts`** — 32 tests

Covers both middleware layers end-to-end by calling `middleware(req)` directly with constructed `NextRequest` objects.

| Group | Tests | Status |
|---|---|---|
| Unauthenticated access (protected routes → /login, webhooks bypass) | 6 | ✓ all pass |
| Authenticated user on /login (all 3 roles → /profiles) | 3 | ✓ all pass |
| Authenticated user on /signup (all 3 roles) | 3 | ✗ AUDIT: /signup not excluded from profile gate |
| Authenticated user on /forgot-password (all 3 roles) | 3 | ✗ AUDIT: coach/admin fall through |
| Authenticated user on / (all 3 roles) | 3 | ✗ AUDIT: coach/admin fall through |
| Coach RBAC (/profiles→/coach, /coach allowed, /admin→/student) | 3 | ✓ all pass |
| Admin RBAC (/profiles→/admin, /admin allowed, /coach→/student) | 3 | ✓ all pass |
| Regular user RBAC (/coach→/student, /admin→/student) | 2 | ✓ all pass |
| Profile cookie gate (no cookie, onboarding carve-out, /profiles exempt) | 3 | ✓ all pass |
| Subscription gate (no sub→/payments, with sub passes, parent bypasses) | 3 | ✓ all pass |
| /reset-password accessibility (all roles) | 4 | ✗ AUDIT: unauthenticated→/login, regular user→/profiles |
| /payments accessibility (no cookie, with profile, coach) | 3 | ✗ AUDIT: regular user without profile→/profiles |
| Cross-profile-type access (student→/parent, parent→/student) | 2 | ✓ pass (documents unguarded behaviour) |
| Coach/admin on /student (unguarded by design) | 2 | ✓ pass |

**Middleware bugs documented by failing tests:**
- `/signup` and `/forgot-password` not excluded from `isProfileLockedRoute` — coaches/admins pass through instead of being redirected home
- `/reset-password` not whitelisted in `updateSession` — unauthenticated users bounce to /login instead of being allowed through
- `/payments` not in the profile-gate carve-out alongside `/onboarding` — regular users without a profile cookie bounce to /profiles

---

### Coach routes (`tests/integration/api/coach/`)

**`lessonspace.test.ts`** — 4 tests

| Test | Status |
|---|---|
| 401 unauthenticated | ✗ AUDIT: currently 200 |
| 403 regular user | ✗ AUDIT: currently 200 |
| 403 wrong coach | ✗ AUDIT: currently 200 |
| 200 assigned coach with MSW-mocked LessonSpace | ✓ |

**`ownership.test.ts`** — 25 tests + 4 todos

Covers `lesson-feedback`, `lesson-progress`, `lessons`, `sessions`, `conversation`, `conversation/message`. Key finding: routes authenticate the caller but never check that the `studentId` or `conversationId` belongs to the calling coach.

| Route | 401 | 403 non-coach | 403 wrong coach | 200 correct coach |
|---|---|---|---|---|
| PATCH lesson-feedback | ✓ | ✗ AUDIT | ✗ AUDIT | ✓ |
| PATCH lesson-progress | ✓ | ✗ AUDIT | ✗ AUDIT | ✓ |
| GET lessons | ✓ | ✗ AUDIT | ✗ AUDIT | .todo (PGRST201 FK bug) |
| GET sessions | ✓ | 404 (no coaches row — correct) | n/a (sessions scoped by coach_id) | ✓ |
| GET sessions cross-coach data leak | — | — | ✓ no leakage | — |
| GET conversation | ✓ | ✓ | ✗ AUDIT | ✓ |
| GET conversation/message | ✓ | ✗ AUDIT | ✗ AUDIT | ✓ |

---

### Admin routes (`tests/integration/api/admin/`)

**`auth.test.ts`** — 22 tests (pre-existing)

Covers: `GET /students`, `GET /employees`, `GET /courses`, `POST /courses`, `POST /create-admin`, `GET /pending-bookings`.

**`auth-extended.test.ts`** — 85 tests

Covers all remaining admin routes. Every route has 3 tests (401, 403-regular, 403-coach) plus an admin happy-path test where feasible.

Routes covered:

| Route | Auth status |
|---|---|
| `GET /api/admin/assignments` | ✗ no auth (tests red) |
| `POST /api/admin/assignments` | ✗ no auth |
| `DELETE /api/admin/assignments/[id]` | ✗ no auth |
| `PUT /api/admin/courses/[id]` | ✗ no auth |
| `DELETE /api/admin/courses/[id]` | ✗ no auth |
| `GET /api/admin/courses/[id]/lessons` | ✗ no auth |
| `POST /api/admin/courses/[id]/lessons` | ✗ no auth |
| `PUT /api/admin/courses/[id]/lessons/[lessonId]` | ✗ no auth |
| `DELETE /api/admin/courses/[id]/lessons/[lessonId]` | ✗ no auth |
| `POST /api/admin/courses/assign` | ✗ no auth |
| `POST /api/admin/create-coach` | ✓ already has auth (4 green) |
| `PUT /api/admin/employees/[id]` | ✗ no auth |
| `GET /api/admin/employees/[id]/availability` | ✗ no auth |
| `PUT /api/admin/employees/[id]/availability` | ✗ no auth |
| `GET /api/admin/payment-plans` | ✗ no auth |
| `POST /api/admin/payment-plans` | ✗ no auth |
| `PATCH /api/admin/payment-plans/[id]` | ✗ no auth |
| `PATCH /api/admin/payment-plans/[id]/archive` | ✗ no auth |
| `GET /api/admin/payment-plans/stripe-preview` | ✗ no auth |
| `PATCH /api/admin/pending-bookings/[id]` | ✗ no auth |
| `POST /api/admin/pending-bookings/[id]/preview` | ✗ no auth |
| `POST /api/admin/pending-bookings/[id]/approve` | ✗ no auth |
| `PUT /api/admin/students/[id]` | ✗ no auth |
| `GET /api/admin/students/lessons/[studentId]` | ✗ no auth |

**Fix pattern** — add to each route before any business logic:
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { data: account } = await supabase.from("account").select("role").eq("id", user.id).single();
if (account?.role !== 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### Parent routes (`tests/integration/api/parent/`)

**`students.test.ts`** — 4 tests (pre-existing)

`GET /api/parent/students/[studentId]`:
- 401 unauthenticated → ✗ AUDIT: currently 200
- 403 caller doesn't own student → ✗ AUDIT: currently 200
- 200 caller owns student → ✓
- 404 with correct HTTP status (not 200 + `{status:404}` in body) → ✗ AUDIT

---

### Subscription routes (`tests/integration/api/subscriptions/`)

**`subscriptions.test.ts`** — 24 tests, all green

Covers cancel, resume, schedule/cancel, schedule (upgrade). Stripe mocked at the module level (`vi.mock("@/src/services/stripe/client")`).

Key findings:
- `POST /api/subscriptions/schedule` returns 404 (not 401) when unauthenticated — auth check runs after `priceId` validation
- All ownership checks work correctly via `resolveStudentIdForBilling()`
- Refund window boundary correctly enforced
- `sessions_remaining` adjustments documented in attendance tests below (separate from Stripe)

---

### Checkout (`tests/integration/api/checkout/`)

**`checkout.test.ts`** — 9 tests

Stripe mocked via `vi.hoisted()` + `vi.mock("stripe")` (route creates its own `new Stripe()` inline).

| Test | Status |
|---|---|
| 400 missing priceId | ✓ |
| 404 unauthenticated (not 401 — auth runs after priceId check) | ✓ |
| 403 wrong account's student | ✓ |
| 409 student already has active subscription | ✓ |
| 200 existing user happy path | ✓ |
| 200 new sign-up flow (no auth required) | ✓ |
| **SECURITY**: does not log password to console.log | ✗ AUDIT: currently logs on line 25 |
| **SECURITY**: does not store password in Stripe metadata | ✗ AUDIT: stored in `metadata.password` |
| Password not returned in API response | ✓ |

**Critical bug:** `console.log(password)` on line 25 of `/api/checkout/route.ts` leaks plaintext passwords to server logs. The same password is also stored in `stripe.subscriptions.create` metadata, making it visible in the Stripe dashboard. Fix: have clients call `supabase.auth.signUp()` directly before checkout and remove the `password` field entirely from the checkout flow.

---

### Attendance (`tests/integration/api/attendance/`)

**`attendance.test.ts`** — 21 tests

| Group | Tests | Status |
|---|---|---|
| GET auth (401, 400 missing param, 200 coach, 200 regular) | 4 | ✓ all pass |
| GET streak calculation | 1 | ✓ |
| POST auth (401, 403 regular, 400 missing fields) | 3 | ✓ all pass |
| POST sessions_remaining: decrement on attended | 1 | ✓ |
| POST sessions_remaining: no change on cancelled | 1 | ✓ |
| POST sessions_remaining: restore on attended→cancelled upsert | 1 | ✓ |
| POST admin can post attendance | 1 | ✓ |
| DELETE auth (401, 403 regular, 400 missing fields) | 3 | ✓ all pass |
| DELETE no-op when record doesn't exist | 1 | ✓ |
| DELETE attended record restores sessions_remaining | 1 | ✓ |
| DELETE cancelled record no sessions_remaining change | 1 | ✓ |
| GET ownership — different family can read any student's attendance | 1 | ✗ AUDIT |
| POST ownership — unassigned coach can write attendance for any student | 1 | ✗ AUDIT |
| DELETE ownership — unassigned coach can delete any student's attendance | 1 | ✗ AUDIT |

---

### Server actions (`tests/integration/actions/`)

**`selectProfile.test.ts`** — 13 tests, all green

Tests the `selectProfile` server action end-to-end. The action uses `redirect()` (which throws), so tests catch the thrown error and inspect the destination URL. `setProfileCookies` is mocked as a spy to verify it is called (or not) on each path.

| Scenario | Tests | Status |
|---|---|---|
| Missing profileId or profileType | 2 | ✓ |
| Unauthenticated → redirect /login | 1 | ✓ |
| Student profile, owner → cookies set + redirect /student | 1 | ✓ |
| Student profile, wrong account → /profiles?error=not_found | 1 | ✓ |
| Student profile, non-existent id → /profiles?error=not_found | 1 | ✓ |
| Student profile, custom destination | 1 | ✓ |
| Parent profile, no PIN, owner → cookies set + redirect /parent | 1 | ✓ |
| Parent profile, no PIN, wrong account → /profiles?error=not_found | 1 | ✓ |
| Parent profile, with PIN, correct → cookies set + redirect /parent | 1 | ✓ |
| Parent profile, with PIN, wrong → /profiles?error=wrong_pin | 1 | ✓ |
| Parent profile, with PIN, omitted → /profiles?error=wrong_pin | 1 | ✓ |
| Parent profile, non-existent id → /profiles?error=not_found | 1 | ✓ |

**`sendMessage.test.ts`** — 9 tests + 1 todo, all passing

Tests the `sendMessage` server action. The action returns `{ error, message }` (no redirect). Active-profile cookies are appended to `nextCookies.header` to drive sender-name resolution.

| Scenario | Tests | Status |
|---|---|---|
| Unauthenticated → `{ error: true }` | 1 | ✓ |
| Empty text → `{ error: true }` | 1 | ✓ |
| Whitespace-only text → `{ error: true }` | 1 | ✓ |
| Student profile → sender name from `students` table | 1 | ✓ |
| Parent profile → sender name from `parents` table | 1 | ✓ |
| No profile (coach fallback) → sender name from `coaches` table | 1 | ✓ |
| Message has id, text, created_at, sender_id | 1 | ✓ |
| Message text matches input verbatim | 1 | ✓ |
| avatar_url is null when not set | 1 | ✓ |
| Cross-conversation gap (no membership check) | — | todo |

**`getLessonSpace.test.ts`** — 6 tests, all green

Tests the `getLessonSpace` server action. LessonSpace HTTP calls are intercepted by MSW. Two tests capture the outbound request body to assert `includeWebhooks: false` and the correct `lesson_space_id`.

| Scenario | Tests | Status |
|---|---|---|
| No active profile → throws "Unable to identify student" | 1 | ✓ |
| Active profile = parent → throws "Unable to identify student" | 1 | ✓ |
| Student with null lesson_space_id → throws "Unable to find room" | 1 | ✓ |
| Student with lesson_space_id → returns client_url | 1 | ✓ |
| Outbound request has no `webhooks` field (includeWebhooks: false) | 1 | ✓ |
| Outbound request sends correct lesson_space_id as room id | 1 | ✓ |

---

## What's not covered yet

### Intentionally deferred (not Phase 2 scope)

- **`/api/profiles/*`** — profile selection, creation, and validation routes
- **`/api/user/*`** — user account management routes
- **`/api/lesson-progress/*`** — standalone lesson progress route (separate from the coach group)

### Phase 3 — Webhook contract tests

Neither webhook handler has integration tests yet. Both have significant bugs:

**`/api/webhooks/stripe`** — to write:
- `invoice.paid` (first payment): creates `student_subscriptions`, provisions LessonSpace room, calls matchmaking
- `invoice.paid` (renewal): updates period dates, resets `sessions_remaining`
- `customer.subscription.deleted`: marks subscription cancelled
- `setup_intent.succeeded` (upgrade): creates SubscriptionSchedule, stores `pending_*` fields
- `invoice_payment.paid` (phase transition): activates pending plan
- Signature verification: tampered body → 400, missing header → 400
- Replay idempotency (no event-ID log currently exists — test documents the gap)

**`/api/webhooks/lessonspace`** — to write:
- No signature verification (any POST currently accepted) — test documents gap
- Hardcoded recipient bug: sends email to `wdstalkmaze@gmail.com` instead of `account.email`
- Valid payload → email sent to correct address (once bug is fixed)
- Unknown `webhook_room_id` → 404, no email

Fixture files already exist in `tests/fixtures/stripe/` and `tests/fixtures/lessonspace/`.

### Phase 4 — E2E

Playwright not yet configured. Target journeys:
- Signup → onboarding → payment (Stripe test card) → student dashboard
- Coach session flow
- Admin booking approval → session materialization

### Pre-refactor characterisation tests

Before each god-component refactor, add journey-level tests at the API boundary:
- `CourseLessonPanel.tsx` → `/api/admin/courses/[id]/lessons` CRUD
- `LessonDetailClient.tsx` → `/api/coach/lesson-progress`, `/api/coach/lesson-feedback`, `/api/coach/lesson-tasks`
- `ParentProfilePageClient.tsx` → parent profile server actions
- `StudentProfilePageClient.tsx` → student profile server actions

---

## CI

The workflow lives at `.github/workflows/test.yml`. It triggers on push to `main`/`dev` and on pull requests targeting those branches. Draft PRs skip the integration job.

**Unit job** (`unit`) — ubuntu-latest, no Docker, ~10s:
1. `npm ci`
2. `npm run test:unit`

**Integration job** (`integration`) — ubuntu-latest, Docker required, ~2–3 min:
1. `npm ci` (installs the Supabase CLI binary bundled in the npm package)
2. `npx supabase start` (spins up Postgres 17 + GoTrue in Docker)
3. Parse `npx supabase status` output to extract the locally-generated anon key and service role key → write to `$GITHUB_ENV`
4. `npm run test:integration` with `STRIPE_SECRET_KEY=sk_test_dummy` and `STRIPE_WEBHOOK_SECRET=whsec_test_talkmaze_integration`

**No GitHub secrets needed for the Supabase keys** — they are ephemeral, generated by the local CLI for each run, and valid only for that job. They are extracted dynamically from `supabase status` output.

The `global-setup.ts` looks for `.env.test` on disk first; when the file is absent (as in CI) it falls back to `process.env`, which is already populated by `$GITHUB_ENV` before the test runner starts.

**Concurrency:** `cancel-in-progress: true` cancels a queued run when a newer commit arrives on the same branch, saving CI minutes.

---

## Infrastructure notes

### Key patterns learned during implementation

**Stripe mocking — two patterns, pick based on client type:**
- Routes using the shared `@/src/services/stripe/client` → mock with `vi.mock("@/src/services/stripe/client", () => ({ stripe: { ... } }))`
- Routes creating `new Stripe(...)` inline (checkout) → mock with `vi.hoisted()` + `vi.mock("stripe", () => ({ default: function() { return instance; } }))` (must use `function`, not arrow, for `new` to work)
- **Do NOT use MSW for Stripe** — the Stripe SDK uses native `fetch` in Node 18+, which MSW's `setupServer` doesn't fully intercept. MSW works for LessonSpace and Resend (which use `node-fetch`).

**`server-only` package** — any route importing a lib file with `import "server-only"` will fail unless mocked. Added to `tests/setup/integration-mocks.ts`:
```ts
vi.mock("server-only", () => ({}));
```

**GoTrue rate limiting** — when many test files run back-to-back, GoTrue can return empty error objects `{}` from `auth.admin.createUser()`. Fixed by adding retry logic (3 attempts, 800ms backoff) to `createAccount()` in `tests/helpers/factories.ts`. If a test file runs after several others, add a settling delay at the start of `beforeAll`.

**Test isolation** — tests run sequentially (`singleFork: true`). DB state accumulates across tests in the same file. Use separate student/subscription fixtures for tests that mutate state (e.g., don't use the same student for both cancel-at-period-end and cancel-with-refund tests).

**`next/headers` mock** — cookies are injected via `nextCookies.header` in `tests/setup/integration-mocks.ts`. The `call()` helper sets this before each route invocation. Route handlers that call `cookies()` from `next/headers` pick up the injected value automatically.

### Test commands

```bash
npm run test:unit              # vitest run --config vitest.config.ts
npm run test:integration       # vitest run --config vitest.integration.config.ts
npm run test:unit -- --watch   # watch mode for unit tests
```

Both configs are at the repo root. Integration tests require local Supabase (`supabase start`) and `.env.test`.

### `.env.test` (gitignored)

Required to run integration tests locally. Get the Supabase keys from `npx supabase status --output env` after `supabase start`.

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase status>
LESSONSPACE_API_KEY=ls_test_dummy
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_WEBHOOK_SECRET=whsec_test_dummy
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy
```

In CI, `global-setup.ts` falls back to `process.env` when `.env.test` is absent — the integration job writes the Supabase keys to `$GITHUB_ENV` before the test runner starts.
