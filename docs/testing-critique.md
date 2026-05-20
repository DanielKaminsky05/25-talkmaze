# Integration Test Suite — Critique

A deep read of `tests/integration/**`, `tests/helpers/**`, and `tests/setup/**`. The strategy in `docs/testing-strategy.md` is sound; this document is about the gap between that strategy and what landed.

The user's instinct — **"my tests reinforce existing behaviour rather than the best behaviour"** — is correct, and not just in the obvious "RED tests document audit bugs" sense. There are at least five distinct mechanisms in this suite that pin implementation choices the codebase already wants to change. Those are the most expensive tests to own.

---

## TL;DR

| Category | Severity | Notes |
|---|---|---|
| Asserts current-bug behaviour as if correct | **High** | Codifies 404-for-unauth, status-in-body 404s, unguarded cross-profile access. Bugs can't be fixed without editing tests. |
| Status-code-only assertions | **High** | ~80% of tests assert only `res.status`. A route that 403s while still writing to the DB passes. |
| `resetDb()` is dead code | **High** | Imported in one file, never called. The strategy's isolation guarantee is fiction; the suite leans on shared `beforeAll` state and uniqueness hacks instead. |
| Admin "happy-path" tests use `expect([200, 204, 404]).toContain(res.status)` | **Medium** | This asserts "didn't 500." It is not a behavioural test. |
| Subscriptions mocks asserted only by `{ success: true }` | **Medium** | `stripe.refunds.create` is mocked but never verified to be called with the right args — the actual refund-issuance behaviour is untested. |
| Direct route-handler calls bypass `src/middleware.ts` | **Medium** | A fix routed through middleware (instead of per-route guards) would slip through. |
| 4-tests-per-route admin wallpaper | **Low** | High test count, low information density. Parameterise. |
| No webhook contract tests | **Medium** | Helper, fixtures, and `tests/contract/webhooks/` all exist. Zero tests. Highest-value gap. |

The suite passes the bar of "exists, runs in CI, and finds real bugs." It does not yet pass the bar of "stays useful after the bugs are fixed."

---

## What's working

These are genuine wins — don't lose them in the cleanup.

1. **Real Postgres, real RLS, real GoTrue.** Most SaaS suites stub the DB. Booting Supabase in Docker and exercising RLS for real is the correct choice and it's already paying off (the matchmaking and attendance behaviour tests would be untrustworthy against a mocked DB).

2. **MSW for LessonSpace and Resend; module mock for Stripe.** The Stripe SDK uses native fetch in Node ≥18 and MSW can't intercept it cleanly; switching to `vi.mock` for Stripe alone is the right call and the comment in `checkout.test.ts:30-35` and `testing-coverage.md:340` documents the gotcha for the next reader. Good operational hygiene.

3. **Direct route-handler invocation via `call()`.** No `next start`, no port collisions, ~100ms per test. The handler is exercised through the real `cookies()`/`NextRequest` path, so the test isn't a mock of a mock.

4. **Audit-driven test catalogue.** Every failing test maps to a numbered finding in `repo-quality-audit.md`. When a test goes green, you've actually fixed something. That's a measurable safety net — not a coverage number.

5. **`sendMessage.test.ts` and `selectProfile.test.ts` test semantics, not structure.** They assert *which table the sender name came from*, not "the route returned 200." This is the model.

6. **DST/timezone discipline** in the unit-test layer. (Not in scope here, but worth noting — that work is solid.)

7. **The strategy document is excellent.** It calls out the right priorities (test journeys, fix-the-bug-then-flip-the-test, MSW over spies). The critique below is mostly about implementation drift from the strategy you wrote.

---

## Patterns to fix

### 1. Tests that pin the wrong behaviour

The user's own thesis. Concrete instances:

- **`tests/integration/api/checkout/checkout.test.ts:148`**
  ```ts
  it("returns 404 (not 401) when unauthenticated — auth check runs after priceId check", async () => {
    ...
    expect(res.status).toBe(404);
  });
  ```
  This isn't documenting a bug — it's *asserting* the buggy ordering as the contract. When someone moves the auth check before `priceId` validation (which they should), this test goes red. It should be `it.todo("returns 401 when unauthenticated, regardless of body validity")`, or — better — a current-behaviour pin labelled `REGRESSION:` so it's obvious it must be deleted on fix.

- **`tests/integration/api/subscriptions/subscriptions.test.ts:407`** — identical pattern for the schedule route. Same fix.

- **`tests/integration/api/subscriptions/subscriptions.test.ts`** uses `expect(404)` for "student belongs to a different account" (lines 233, 300, 354). The strategy doc explicitly says "(or 404 to avoid enumeration; pick and pin)" — this is a deliberate decision. But the *test text* reads as if 404 is the right answer for "not yours." It conflates "doesn't exist" with "you don't own it." Pick one (404 to avoid enumeration is defensible) and split the assertions:
  ```ts
  it("returns 404 to prevent ownership enumeration", ...);  // ownership
  it("returns 404 when the subscription truly doesn't exist", ...);  // existence
  ```
  so a future reader doesn't read it as "ownership is implicitly 404."

- **`tests/integration/middleware/redirects.test.ts:370-386`** — "cross-profile-type access (currently unguarded)". The test asserts that a student profile *can* reach `/parent`. The comment notes "if cross-profile access should be blocked, add explicit checks here" — but the test will block any fix because flipping the policy makes it red. If this is policy, it should be in a doc; if it's an oversight, it should be `it.todo`.

- **`tests/integration/middleware/redirects.test.ts:393-403`** — same shape. Coach/admin on `/student` asserted as `not.toBe(307)`. The comment says "intentional — admin may need to preview the student view." Is that confirmed product policy? If yes, the test is right and should say so without hedging. If no, it's pinning a current behaviour as a contract.

- **`tests/integration/api/parent/students.test.ts:61-69`** — clean example of how to do it: comments say "AUDIT: currently returns 200 with `{ status: 404 }` in body — wrong. Should return HTTP 404," and the test asserts the *correct* future state (`expect(res.status).toBe(404)`). The test is RED today and turns GREEN on fix. Copy this style.

**Rule of thumb.** If a test would need to be deleted (not modified) to fix a bug, you're pinning the bug. Either flip it to assert the desired behaviour and mark it `// REGRESSION:` so it's obviously red until fixed, or use `it.todo` to record intent without locking in current behaviour.

---

### 2. Status-code-only assertions

`auth-extended.test.ts` is 85 tests. Almost every one is `expect(res.status).toBe(401|403|200)`. Nothing else.

What this *doesn't* catch:

- A 403 that still wrote to the DB before returning (auth check placed after the mutation).
- A 200 with an empty response body (admin GET returns `[]` even when seeded data exists).
- A 401 that leaks the existence of a resource via timing or error message.
- A 200 that returns the wrong tenant's data.

Concrete example: **`tests/integration/api/admin/auth-extended.test.ts:154-165`** — POST /api/admin/assignments with FAKE_IDs. Today this fails the FK constraint and likely returns 500 or 400 *before* auth runs. The `expect(401).toBe(401)` test will pass once auth is added — but it would *also* pass if the route went `FK check → 500 → "Internal error"` for the unauthenticated case. That's not auth enforcement; it's an FK error wearing a 4xx hat.

Better pattern for every audit regression test:

```ts
it("rejects unauthenticated POST and does not create an assignment", async () => {
  const res = await call(POST, { method: "POST", cookies: ANON.cookies, body });
  expect(res.status).toBe(401);

  const { count } = await adminDb
    .from("course_assignment")
    .select("*", { count: "exact", head: true });
  expect(count).toBe(0);  // no side effect
});
```

Pair every "unauthorized" test with an absence-of-side-effect assertion. Pair every "happy path" test with a presence-of-side-effect assertion. That's the floor.

---

### 3. `resetDb()` is dead code

`tests/helpers/db.ts` exports `resetDb()`. The strategy doc (line 157, 498) says "Truncate all tables between tests" and "`beforeEach(resetDb)`." A grep across `tests/` shows **one** import (`tests/integration/api/admin/auth.test.ts:17`) and **zero** calls.

Consequences this suite is already paying for:

- `tests/integration/api/admin/auth.test.ts:45-48` literally documents this: `// Do NOT reset DB per test here — shared accounts were created in beforeAll.`
- `tests/integration/api/attendance/attendance.test.ts:48-54` works around shared state with "unique dates per test to avoid unique-constraint collisions."
- `tests/integration/api/subscriptions/subscriptions.test.ts:273` comment: "After the previous test, cancelled_at is set but status is still 'active'." Test ordering is now load-bearing.
- `tests/integration/api/subscriptions/subscriptions.test.ts:455-487` reinvents per-test fixture seeding inline because the shared fixture got mutated by an earlier test.
- `tests/helpers/factories.ts:37` uses `RUN_ID = ${Math.random()}${Date.now()}` to dodge email collisions, and lines 66-76 add a 3× retry with 800ms backoff because GoTrue rate-limits.
- `tests/integration/api/admin/auth-extended.test.ts:92` does `await new Promise(r => setTimeout(r, 1500))` "to let GoTrue settle."

Each workaround is rational in isolation. Together they signal a structural problem: the suite avoids isolation because isolation isn't implemented.

Also: `resetDb()` itself is wrong as written. `db.from(table).delete().neq("id", "")` (line 52):
- Doesn't reset sequences (no `RESTART IDENTITY`).
- Doesn't clear `auth.users` — that has to happen via the GoTrue admin API.
- The `neq("id", "")` predicate works by accident on UUID PKs (every UUID is `!= ""`), but it's not a `TRUNCATE`. Composite-PK tables (`coach_students`, `course_assignment`) might not have a column literally named `id`.

**Fix.** Either:
- Implement a real `resetDb()` using `TRUNCATE … RESTART IDENTITY CASCADE` via the service-role client (or a raw SQL RPC), plus an explicit `auth.users` sweep. Call it from `beforeEach` in every integration file.
- Or commit to the current "per-file shared fixture" model honestly: rename `db.ts` to indicate it's a one-shot helper, delete the unused export, drop the strategy-doc claim about per-test truncation, and make every file's `beforeAll` exhaustively self-seeded.

The middle ground you have now — strategy claims isolation, implementation provides shared state, helpers exist but are unused — is the worst of both. New contributors will write tests trusting the strategy doc, and they'll flake.

---

### 4. "Happy path" assertions that just verify the route didn't 500

`tests/integration/api/admin/auth-extended.test.ts` has a dozen tests of the shape:

```ts
it("admin gets a non-auth response for a real course", async () => {
  const res = await call(coursesPUT, { method: "PUT", cookies: adminCookies, params: { id: courseId }, body });
  expect([200, 204, 404]).toContain(res.status);
});
```

That's `expect(res.status).not.toBe(500)` with extra steps. It does not assert the course was actually updated, nor that the unauthorized branch didn't run. Delete these or upgrade them to assert side effects.

The four routes that *do* assert behaviour properly:
- `tests/integration/api/coach/ownership.test.ts:272-282` — "does not leak the other coach's sessions" — asserts `body.sessions.length === 0`. Good.
- `tests/integration/api/attendance/attendance.test.ts:172-182` — asserts streak calculation. Good.
- `tests/integration/api/attendance/attendance.test.ts:217-227` — asserts `sessions_remaining` changes. Good.
- `tests/integration/actions/sendMessage.test.ts:130-148` — asserts sender name from the right table. Good.

That's it. Four behavioural assertions across 268 tests. The rest mostly assert "the HTTP layer responded with a plausible status code."

---

### 5. Subscriptions: mocks set up, mocks never asserted

`tests/integration/api/subscriptions/subscriptions.test.ts:272-285`:

```ts
it("returns 200 and issues a refund when within the 28-day window", async () => {
  mockSubList(studentWithSubId);
  mockInvoiceRetrieve();
  const res = await call(cancelPOST, { ... refund: true });
  expect(res.status).toBe(200);
  expect(body.success).toBe(true);
});
```

The mock for `stripe.refunds.create` is set up at line 49 but **never asserted against**. The test passes if the route returns `{ success: true }` and doesn't call `refunds.create` at all. The single most important assertion — *did we actually attempt the refund* — is missing.

Same shape in the schedule upgrade test (line 489-507): the SetupIntent mock is configured but `mockSetupIntent.mock.calls[0]` isn't inspected. The pending plan ID isn't verified in DB. The two-phase schedule isn't tested.

Strategy doc says: *"MSW assertions over function spies."* You're using spies and you're not even asserting on them. Pick one:
- Spy on the Stripe client mocks and assert the call args (cheaper).
- Move to MSW intercepting the Stripe HTTP layer and assert payloads (more honest, but the Node-fetch interception issue is documented).

Either way, the test must say "Stripe was asked to do X" and the DB must say "Y persisted."

---

### 6. Direct route-handler calls bypass `src/middleware.ts`

`call()` constructs a `NextRequest` and invokes a route handler directly. Middleware does not run.

This is fine for testing the handler's own auth logic. It is **not** fine if you ever consolidate auth into middleware. The audit's fix recommendation in `testing-coverage.md:134-140` is to add the auth check inside each route handler — that's why the current tests work. But:

- If someone refactors to a Next.js middleware-based auth model (which is the idiomatic fix for "17 routes have no auth"), all the `expect(401)` tests in `auth-extended.test.ts` will silently *fail to fail* if the handler still has no check, because the middleware would have stopped the request before the handler runs — but the test never invokes middleware.
- The `redirects.test.ts` file is the only middleware test, and it has zero overlap with API handlers.

Mitigation: either commit to "API auth lives in handlers, middleware only handles redirects" as an explicit architectural decision (document it, lint it), or write at least one test per critical handler that goes through middleware too. A `callViaMiddleware(handler, ...)` wrapper that runs `middleware(req)` first, follows the 307, and then invokes the handler would be enough.

---

### 7. The four-test admin wallpaper

`auth-extended.test.ts` runs 4 tests × 24 routes ≈ 85 tests, all structurally identical. The information density is one bit per test ("does role X get gated?"). The 85 tests collectively encode about 24 facts: "route X gates non-admins."

This is fine as long as it stays cheap to run, but two costs are already visible:
- The file is 508 lines of near-identical blocks. Reviewing a change is hard.
- A regression that adds a new role (say role=4 for "billing admin") needs 24 new tests, not 1.

Parameterise:

```ts
const ADMIN_ROUTES = [
  { name: "GET /assignments", handler: assignmentsGET, opts: {} },
  { name: "POST /assignments", handler: assignmentsPOST, opts: { method: "POST", body: { coachId: FAKE_ID, studentId: FAKE_ID } } },
  // ...
];

const ROLES = [
  { name: "anon", cookies: () => ANON.cookies, expected: 401 },
  { name: "regular", cookies: () => regularCookies, expected: 403 },
  { name: "coach", cookies: () => coachCookies, expected: 403 },
];

for (const route of ADMIN_ROUTES) {
  for (const role of ROLES) {
    it(`${route.name} returns ${role.expected} for ${role.name}`, async () => {
      const res = await call(route.handler, { ...route.opts, cookies: role.cookies() });
      expect(res.status).toBe(role.expected);
      // + assert no side effect
    });
  }
}
```

72 generated tests, 30 lines of declaration, the matrix in one place.

---

### 8. No webhook contract tests

`tests/helpers/stripe.ts` — webhook signing helper, written. `tests/fixtures/stripe/*.json` — three fixtures, captured. `tests/contract/webhooks/` — empty directory.

This is the single highest-value layer that's missing. Webhook handlers that 200 while silently doing nothing are the classic SaaS production bug (no user is watching the return code), and the audit calls out two known issues here already:

- `/api/webhooks/lessonspace` has no signature verification and emails to a hardcoded address.
- `/api/webhooks/stripe` has no replay idempotency.

Both are testable today with the infrastructure that exists. The "first payment skips matchmaking" inconsistency the strategy doc calls out (line 304) is the kind of thing a fixture-replay test pins immediately.

Priority order if you have one afternoon:
1. `stripe.invoice.paid` first payment → assert `student_subscriptions` row with right `sessions_remaining`.
2. `stripe.invoice.paid` renewal → assert period dates updated, sessions reset, matchmaking called.
3. `lessonspace` session-summary → assert email recipient is `account.email`, not the hardcoded address. This is the test that *should* be RED today and turns GREEN when the bug is fixed.

---

### 9. Smaller stuff

- **`tests/setup/integration-mocks.ts:13-25`** — `cookies().set` is a `vi.fn()` no-op. Any handler that sets a cookie has its set call swallowed. The strategy works around this by mocking `setProfileCookies` directly in `selectProfile.test.ts`, but it means no integration test can ever observe a cookie set by a handler. If you add a route that issues an auth cookie, you'll need to upgrade the cookie jar to actually record sets.

- **`tests/helpers/auth.ts:29`** — encodes the entire Supabase session JSON into a cookie. That's how `@supabase/ssr` works, so this is correct, but the encoding will drift when Supabase changes its cookie format (they've done it twice). Worth a comment pointing at the Supabase SSR source.

- **`tests/integration/middleware/redirects.test.ts:283-297`** — the subscription gate test asserts the middleware accepts *any* session + the subscribed student's profile cookie, even when the session owner isn't the student's family. The comment notes this explicitly. This is currently true and it's a real bug (cookie value isn't validated against session) but the test is asserted as if it's correct behaviour. Same anti-pattern as §1.

- **Real-clock arithmetic** — `subscriptions.test.ts:150` (`Date.now() - 29 * 24 * 60 * 60 * 1000`) is fine today but if a test ever asserts "exactly 28 days inclusive vs exclusive" it'll flake at midnight UTC. Strategy says "fix time" — integration tests don't.

- **`it.todo` mid-block** (`tests/integration/api/coach/ownership.test.ts:240-249`, `:366-371`) — the PGRST201 todo is a documented blocker; that's fine. But the LessonSpace FormData todos at line 366 are open-ended. Either write a `FormData` helper for the `request.call()` API (the JSON-only signature is a real gap), or close the todo with a tracked issue.

- **`tests/helpers/db.ts:17-42`** — the `TRUNCATE_ORDER` array is maintained by hand. When a new table is added, this list silently drifts. Either compute it from `information_schema.tables` minus a denylist, or `TRUNCATE … CASCADE` and stop ordering by hand.

---

## What to do next, in order

1. **Stop pinning current bugs as correct behaviour.** Walk the four pin-the-bug instances (`checkout.test.ts:148`, `subscriptions.test.ts:407`, `redirects.test.ts:370-403`) and either flip them to assert the desired behaviour (RED until fixed) or change them to `it.todo` with a tracked issue. The `parent/students.test.ts` style is the template.

2. **Implement real DB isolation.** Either:
   - Rewrite `resetDb()` to `TRUNCATE … RESTART IDENTITY CASCADE` plus `auth.users` sweep, call it from `beforeEach` in every integration file, delete the workarounds (RUN_ID, unique-date schemes, GoTrue settle delays).
   - Or document the "per-file shared fixture, no per-test reset" decision in the strategy doc, delete the unused `resetDb()` export, and remove the strategy claim about per-test truncation.

3. **Add side-effect assertions to every auth and ownership test.** A 403 isn't proof of enforcement unless you also assert "no row was created." Same for 200 happy paths — the row must exist. Write a `expectNoSideEffect(table, predicate)` helper.

4. **Replace "200|204|404" boilerplate with real assertions.** The 12-or-so `expect([200, 204, 404]).toContain(res.status)` tests verify nothing useful. Either assert the persistence delta or delete them.

5. **Assert against the Stripe mocks in `subscriptions.test.ts`.** Refund must call `stripe.refunds.create` with the right amount. Schedule must create a SetupIntent with the right metadata and write `pending_plan_id` to the DB.

6. **Write the three highest-value webhook contract tests** (Stripe `invoice.paid` first payment, Stripe `invoice.paid` renewal, LessonSpace session-summary recipient). The infrastructure is all there.

7. **Parameterise the admin auth matrix.** Cut `auth-extended.test.ts` from 508 lines to ~150. Same coverage, less wallpaper.

8. **Decide whether middleware can hold auth.** If yes, write a `callViaMiddleware()` helper and add at least one path-through test per gated handler. If no, document the policy.

9. **Fix the strategy doc / implementation drift.** The strategy says "time is fixed," "MSW assertions over spies," "beforeEach truncates." None of these are true in the integration suite. Either update the strategy or close the gap.

---

## A template the suite should converge on

The `parent/students.test.ts` file is small but it gets the shape right. Three principles:

1. **The test asserts the *correct* future behaviour, not the current behaviour.** When the bug is RED, the test is RED. When the bug is fixed, the test goes GREEN with no edit.
2. **Each test has a one-sentence purpose** (`returns 403 when the caller does not own the student`), and the assertion matches exactly that purpose.
3. **No shared state between tests in the same file** beyond the immutable seed in `beforeAll`. If a test needs a mutable fixture, it creates one.

If every integration test in this repo looked like that file, the suite would be ~30% smaller and ~3× more useful.

---

## Addendum — reading the API side

The earlier sections critiqued the test files in isolation. This addendum reads the *route handlers* the tests exercise and asks: **do the tests describe what these endpoints should do, or just what they currently do?** Answer: overwhelmingly the latter, and in several places they actively codify bad design.

Concrete findings, each with the route handler that motivated it.

### 1. The API has no contract — and the tests inherit that

`src/app/api/admin/students/route.ts:8` is the whole handler:

```ts
const { data, error } = await supabase.from('students').select("*");
console.log("Data: " + data)
return NextResponse.json(data);
```

That's `SELECT * FROM students` straight to the client, no auth, no role check, no shape, no pagination, no field redaction, no error-on-error (the unused `error` variable is a tell). The test for this route does exactly `expect(res.status).toBe(200)` for the admin case.

Under that test, every one of the following could land without breaking the suite:
- Someone wraps the response in `{ students: data }` (breaking every existing caller).
- Someone drops `select("*")` to `select("id")` (returns only ids).
- Someone removes `from("students")` entirely and returns `null`.
- Someone leaks `students.notes` (an internal field) to a client that's not supposed to see it.

The test passes in all cases. There is no contract being tested — only "the function returns a 200." Multiply this across the 24 admin routes in `auth-extended.test.ts` and you have the structural problem in one sentence: **the suite verifies the HTTP layer ran without crashing, not that the API returns what it should**.

### 2. Tests codify the audit-listed bad design as the expected contract

The cleanest example is `src/app/api/parent/students/[studentId]/route.ts:17,23`:

```ts
if(!accountId || accountIdError){
  return NextResponse.json({status:404, message: "Unable to find account"})
}
```

That's HTTP 200 with `{ status: 404 }` in the body. The audit calls it out. The test (`parent/students.test.ts:68`) correctly asserts `expect(res.status).toBe(404)` — RED today, GREEN on fix. That's the right pattern.

But the same anti-pattern lives elsewhere and **isn't** caught:

- `src/app/api/coach/lessonspace/[coachId]/[studentId]/route.ts:27-37` returns `{ status: 500, message: ... }` with HTTP 500 for both "student not found" and "LessonSpace adapter failed." Tests assert 401/403/200 only. There's no test pinning the error shape, so when this is "improved" to distinguish 404 from 500, no test will tell you the response body format changed.

- `src/app/api/coach/lesson-progress/route.ts:136-139` returns `{ error: "Internal server error" }` for any catch — swallowing the real Supabase error. Tests assert success paths and 401, never the error-swallowing behaviour. A refactor that surfaces the real error message would pass tests but break any client that depends on the opaque string.

- `src/app/api/coach/conversation/route.ts:26` returns **403** for "coach record not found" (`if (!coach) return ... 403`). That's a 404 wearing a 403 mask — the caller is authenticated but their account simply has no `coaches` row. The test (`ownership.test.ts:296`) asserts 403 for a regular user, which works *for the wrong reason* (regular user → no coaches row → 403). When the route is hardened to actually check role *before* the coach lookup, the test will keep passing, but the meaning will be different. The test doesn't distinguish.

### 3. Tests pin the auth-vs-validation ordering bug instead of fixing the contract

Three routes do auth in different orders, and the tests pin all three orderings as if each were correct:

| Route | Order | Test pins |
|---|---|---|
| `subscriptions/cancel/route.ts:76-78` | auth → validation | 401 ✓ |
| `subscriptions/schedule/route.ts:20-34` | priceId → auth (returns 404 `"User not found"` for unauth) | 404 ✗ (`subscriptions.test.ts:407`) |
| `checkout/route.ts:27-53` | priceId → auth (returns 404 for unauth) | 404 ✗ (`checkout.test.ts:148`) |

The right policy is "401 for unauthenticated, regardless of body validity, regardless of route." The current code is inconsistent. The tests document the inconsistency as if it's the contract. A consolidation PR that adopts a single auth-first policy would have to *delete tests* — meaning the tests are actively resisting the consolidation.

Worse: the error *messages* differ too. `cancel` returns `{ error: "Unauthorized" }`, `schedule` returns `{ error: "User not found" }`. Tests check status code only, so the inconsistency is invisible to the suite. A future "standardize error responses" effort can't be regression-tested against the current state.

### 4. The `create-admin` test/route mismatch is a smoking gun

Test body (`auth.test.ts:145`):
```ts
const body = { email, password, firstName: "New", lastName: "Admin" };
```

Route reads (`create-admin/route.ts:7`):
```ts
const { email, password, name } = await request.json();
```

The route validates `if (!email || !password || !name) return 400`. The test never sends `name`. So either:
- The "200 for admin" test is in the 117 RED list because the route returns 400 today (the test is asserting the post-fix state but using the wrong body shape — so it stays RED even after auth is added).
- Or the test passes because the route is so under-validated elsewhere that something else returns 200 first.

Either way, **the test does not describe a working contract**. A reviewer reading it would assume the API accepts `firstName`/`lastName`. It doesn't. The test is wallpaper.

This is the cleanest evidence that the tests were written without reading the route handlers carefully — and that nobody noticed because "expect(res.status).toBe(200)" is silent about everything except the status code.

### 5. Security-test assertions are spelled too narrowly

`checkout.test.ts:224-233`:
```ts
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
await call(POST, { body: { ..., password: "super_secret_abc" } });
expect(consoleSpy.mock.calls.flat()).not.toContain("super_secret_abc");
```

The audit says: *remove the `password` field from the checkout flow entirely; have clients call `supabase.auth.signUp()` themselves.* That's the right fix. The test, however, asserts only that the literal string `"super_secret_abc"` is not in the console output.

A "fix" that does `console.log("password:", "[REDACTED]")` passes the test. A "fix" that does `console.log("password length:", password.length)` passes the test. The `password` field is still in the API surface, still stored in Stripe metadata (`checkout/route.ts:197`), still travelling over the wire. The test catches one specific footgun (literal-value leak to stdout) and misses the bigger one (the field exists at all). The audit's intent — eliminate the field — isn't testable in the current shape.

Better: assert the route rejects bodies that contain a `password` field (`expect(res.status).toBe(400)`), or assert the Stripe `subscriptions.create` mock was called with no `password` key in `metadata`. The second is one line of code and would have caught both the log and the metadata storage.

### 6. Happy-path tests don't pin the things that actually matter

`attendance/route.ts` POST (line 84-88) auto-resolves `coach_id` from the calling user's `coaches` row and writes it to `session_attendance`. That's the *attribution* — who marked this attended? The test (`attendance.test.ts:217-227`) asserts:

```ts
expect(res.status).toBe(201);
const after = await getSessionsRemaining();
expect(after).toBe(before - 1);
```

The test verifies the *sessions_remaining decrement* (good, this is the explicit purpose of the test). It does **not** verify that `coach_id` was set to the calling coach's id. A refactor that drops `coach_id: coachProfile?.id ?? null` and writes `coach_id: null` for every attendance row passes the test. The audit attribution is silently lost.

Same pattern in `coach/sessions/route.ts`: the route correctly scopes by `coach_id` (line 29), and the test confirms no cross-coach leak (good), but doesn't assert that the response contains the *seeded session* for the assigned coach. A regression that returns empty arrays for everyone passes both the leak test and the happy-path test.

### 7. Routes with destructive operations have no behavioural tests

`admin/employees/[id]/availability/route.ts:79-124` is `DELETE FROM coach_availabilities WHERE coach_id = ? ; INSERT new rows`. There's no transaction. If the INSERT fails after the DELETE, the coach has zero availability. The test (`auth-extended.test.ts:337-348`) asserts 401/403 only. No test:
- Calls the PUT with a real body and verifies the rows after.
- Simulates an INSERT failure to characterize what happens to the deleted rows.
- Asserts that the delete-then-insert is bounded to the right coach (the route does `eq("coach_id", coachUUID)` correctly, but the `resolveCoachUUID` helper is a no-op stub at line 14-19 — meaning the route trusts the URL param verbatim, with no validation that it's a UUID).

This is the highest-risk class of route in the codebase (destructive, no transaction, no role check, accepts URL param as identity), and the test suite asserts nothing about its behaviour.

### 8. Tests don't catch the input-validation gaps

`admin/courses/route.ts:29-32` does `body.course.name` with no check that `body.course` is an object. Send `{}` to POST → `TypeError: Cannot read properties of undefined` → 500. The test never sends a malformed body. A test that verifies "400 on missing `course` key, not 500" would force the route to add `if (!body.course) return 400` — a one-line improvement. Multiply by ~12 routes that do `body.thing.field`-style access without checks.

The strategy doc explicitly says: *"every API body is validated by ad-hoc `typeof` checks. When you touch a route, add a schema."* The integration tests are the natural lever for that — they're the place where "send `{}` and expect 400" would live. None of them do this.

### 9. The N+1 in `coach/conversation/message/route.ts` is invisible to the suite

`coach/conversation/message/route.ts:40-79` maps over every message and does a `from("students")` or `from("parents")` lookup per message — the audit's documented N+1. The test (`ownership.test.ts:352-358`) asserts 200 only. It doesn't:
- Count queries (which Supabase doesn't easily expose anyway).
- Assert the shape of the returned `messages` array (so a refactor to a relational `select` join wouldn't be regression-tested against the current "name and avatar per message" output).
- Seed >1 message and verify all are returned.

A correctness-preserving refactor of the N+1 has to be tested manually. The integration suite is silent.

### 10. `lesson-progress` has hidden side effects that aren't tested

`coach/lesson-progress/route.ts` is 142 lines. It updates `lesson_progress`, then on `status === 3` upserts `student_tokens`, then conditionally upserts `student_badges` if every lesson in the course is `status === 3`. That's three side-effect tables, two of which depend on aggregate state.

The test (`ownership.test.ts:203-210`) asserts:
```ts
expect(res.status).toBe(200);
```

No test:
- Calls with `status === 3` and verifies a `student_tokens` row appeared.
- Sets up "every lesson done" and verifies the badge upsert fires.
- Reverts from `3` to `2` and verifies the badge/token rows are deleted (the route does this; it's not characterized).

This is the densest piece of business logic in the coach API surface, and the test asserts only that the HTTP layer returned 200. A refactor of the token/badge logic — including a refactor that *breaks it* — passes the suite.

---

### The pattern across all ten findings

The tests describe **the HTTP layer's existence**, not **the API's contract**.

- For *gates* (auth, ownership), the audit-driven RED tests do describe intent. Those are valuable.
- For *everything else* — what the API returns, what it persists, what side effects it triggers, what input shapes it accepts, how it surfaces errors — the tests describe almost nothing. A handler can be rewritten in any direction (better or worse) and the tests will mostly stay green.

That's why the user's instinct is sharper than the "tests reinforce existing behaviour" framing suggested. It isn't just that the tests pin a few specific bugs (they do — checkout 404, schedule 404, status-in-body 200, cross-profile pass-through). It's that the tests have no opinion at all about most of what the API does. The behavioural surface is wide open: any plausible-looking response passes.

### What "tests reinforce the *right* API" would look like

For each endpoint, the test file should answer five questions, in this order:

1. **Who can call it?** (401/403 matrix, ownership matrix.) — *Mostly done by the audit-driven RED tests.*
2. **What inputs does it accept?** (Schema test: malformed body → 400, not 500. Missing required field → 400. Unknown fields → ignored or rejected, pinned either way.) — *Missing.*
3. **What does it return on success?** (Response shape, not just status. Specific seeded rows must appear. Sensitive fields must not appear.) — *Almost entirely missing.*
4. **What does it persist?** (Side effect table: rows created/updated/deleted match expectations. Attribution columns set correctly. No orphan writes on failure.) — *Done in 4 places; missing in ~250.*
5. **What does it call?** (External APIs: Stripe `refunds.create` was actually called with the right args. LessonSpace participant URL was actually requested with `webhooks=false`.) — *Mocks configured everywhere; assertions made on mocks in `getLessonSpace.test.ts` only.*

A test file that answers all five for a given endpoint is ~5-10 tests, each with a focused assertion. The current files are 20-30 tests, each with one weak assertion. Same volume of test code, very different floor on what survives a refactor.

If you imagine throwing away every route in `src/app/api/` and rewriting them from scratch, **the test suite as it stands gives almost no guidance on what to build**. The audit and the strategy doc give that guidance; the tests don't yet encode it. That's the real gap.
