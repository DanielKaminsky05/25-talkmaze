# Phase 6 brief — type/lint/build cleanup after the contract rewrite

You're a cold instance picking up where the previous session left off. Read this end-to-end before doing anything. It's the only continuity you have.

---

## Context

We just finished a six-phase rewrite of the API contract layer (Phases 0–5 + finalisation passes). See `docs/test-rewrite-runbook.md` for the full plan. Highlights:

- Every gated route in `src/app/api/**` was brought under `requireRole`, `.strict()` Zod validation, and one of the `assertOwns*` helpers.
- Many routes' **response shapes changed**: bare arrays were wrapped (e.g. `[students]` → `{ students: [...] }`), `{ status: N, message: "..." }`-in-body bodies became proper HTTP status codes with `{ error: string }`.
- Several routes were **extracted to `src/lib/<domain>/server/`** (token+badge cascade, linked-list maintenance, scheduling preview, student-lesson assembly).
- Phase 5 added 3 webhook contract test files.
- Middleware was restructured to fix audit-flagged redirect bugs (`/signup`, `/forgot-password`, `/`, `/reset-password`, `/payments`).

**Result**: 528 integration tests pass under CI-shaped env (verified before this brief was written).

The user manually launched a dev server and **hit type errors and client-side runtime issues** caused by the response-shape changes. Phase 6 is fixing those.

---

## Your task

Cleanup type / lint / build errors introduced by the refactor. Run unattended; commit per batch; leave decisions for the user.

### Step 1: inventory (one-time)

```bash
npx tsc --noEmit > /tmp/p6-tsc.log 2>&1
npm run lint     > /tmp/p6-lint.log 2>&1
npm run build    > /tmp/p6-build.log 2>&1
```

Don't act on warnings — only errors. The `.next/dev/types/validator.ts` Cannot-find-module errors are noise from a stale dev build; ignore them. (To clear them once for real: `rm -rf .next/dev/types` before `tsc`.)

### Step 2: triage

Group errors by category, not by file. Most errors will cluster. Expected categories from this refactor:

| Category | Source | Fix shape |
|---|---|---|
| Unused imports | I switched `NextRequest` → `Request` in many routes, dropped local helpers | Delete imports |
| Unused params (`_req`, etc.) | Same | Drop or underscore-prefix |
| Client consumes bare array | I wrapped many list responses (`{ students }`, `{ courses }`, etc.) — see "Response shape changes" below | Update consumer |
| Client consumes `{status, message}` | I removed status-in-body bodies | Read `res.status` + `body.error` instead |
| Stale `NextRequest`-typed params elsewhere | Routes that previously took `NextRequest`, now `Request` | Update or revert per the contract docs |
| Generated DB types vs Zod types | Some routes' return-shape inference differs after extraction | Cast at the boundary |

### Step 3: batch-fix one category at a time

For each category:
1. Find all instances (grep by pattern).
2. Fix all instances in one pass.
3. Re-run the inventory.
4. Commit if that category is fully resolved (no Claude credit in commit message).

### Step 4: ratchet to clean

Repeat until all three commands return zero errors.

### Step 5: leave a status doc

Write `PHASE6_STATUS.md` at the repo root with:
- Each commit you made and what category it cleared.
- Any flagged decisions you DIDN'T make (because they're behavioural, not mechanical).
- A short "runtime smoke test checklist" — UI flows that the user still needs to eyeball because type errors don't catch shape mismatches that pass through `data: unknown`.

---

## Response shape changes (the most important reference)

This is what the client-side consumers will trip over. **Use this as your shape-change cheatsheet.** When you find a UI component fetching a route below and treating the result as the OLD shape, that's a Phase-6 fix.

| Route | OLD response | NEW response |
|---|---|---|
| `GET /api/admin/assignments` | bare array | `{ assignments: [...] }` |
| `POST /api/admin/assignments` | bare entity | `{ assignment: {...} }` |
| `GET /api/admin/courses` | bare array | `{ courses: [...] }` |
| `POST /api/admin/courses` | echoed body | `{ course: {...} }` |
| `PUT /api/admin/courses/[id]` | bare entity | `{ course: {...} }` |
| `GET /api/admin/courses/[id]/lessons` | bare array | `{ lessons: [...] }` |
| `POST /api/admin/courses/[id]/lessons` | bare entity | `{ lesson: {...} }` |
| `PUT /api/admin/courses/[id]/lessons/[lessonId]` | bare entity | `{ lesson: {...} }` |
| `GET /api/admin/employees` | bare array | `{ employees: [...] }` |
| `PUT /api/admin/employees/[id]` | bare entity | `{ employee: {...} }` |
| `GET /api/admin/employees/[id]/availability` | bare array | `{ availability: [...] }` |
| `GET /api/admin/payment-plans` | bare array | `{ plans: [...] }` |
| `POST /api/admin/payment-plans` | bare entity | `{ plan: {...} }` |
| `PATCH /api/admin/payment-plans/[id]` | bare entity | `{ plan: {...} }` |
| `PATCH /api/admin/payment-plans/[id]/archive` | bare entity | `{ plan: {...} }` |
| `GET /api/admin/pending-bookings` | bare array | `{ pending: [...] }` |
| `GET /api/admin/students` | bare array | `{ students: [...] }` |
| `PUT /api/admin/students/[id]` | bare entity | `{ student: {...} }` |
| `GET /api/admin/students/lessons/[studentId]` | bare array | `{ courses: [...] }` |
| `GET /api/admin/courses/assign` | bare array | `{ students: [...] }` |
| `GET /api/coach/lessons` | bare array | `{ lessons: [...] }` |
| `GET /api/coach/students` | bare array | `{ students: [...] }` |
| `GET /api/coach/sessions` | already wrapped | unchanged |
| `GET /api/coach/conversation` | already wrapped | unchanged |
| `GET /api/coach/conversation/message` | bare array | `{ messages: [...] }` |
| `GET /api/parent/students` | bare array | `{ students: [...] }` |
| `GET /api/parent/sessions` | bare array | `{ sessions: [...] }` |
| `GET /api/parent/students/[studentId]` | `{status: 404, message}` in 200 body OR bare row | `{ parent: { id } }` or 404 with `{ error }` |
| `GET /api/parent/students/[studentId]/availability` | bare array | `{ availability: [...] }` |
| `PATCH /api/coach/lesson-tasks` | bare entity | `{ task: {...} }` or `{ deleted: true }` |

### Error shape change (every route)

OLD (anti-patterns we removed):
- `NextResponse.json({status: 404, message: "..."})` returning HTTP 200
- `{ error: err.message }` exposing internals
- `{ message: "..." }` instead of `{ error: "..." }`
- bare strings (`"Error getting lessons..."`) as the body

NEW:
- HTTP status code is the status. Body is `{ error: string }` (optionally `code?`, `details?`).
- `details: parsed.error.flatten()` on Zod validation failures.
- Generic `"Internal server error"` in catch blocks. Never `err.message`.

### Routes deleted entirely

- `/api/profiles/select` (was a 307-redirect endpoint, replaced by the `selectProfile` server action — sole caller was `src/app/(protected)/(families)/profiles/page.tsx`, already updated to use the action).
- `/api/webhooks/stripe/learningSpace` (was a public-mutation endpoint disguised as a webhook — logic extracted to `src/lib/lessonspace/server/provisionStudentRoom.ts`).

If you find any client/server code still pointing at those URLs, that's a Phase-6 fix.

---

## Hard rules

- **DO NOT edit `.test.ts` files.** The test files are the contract spec — they pin the new response shapes. If a test seems wrong, surface in `PHASE6_STATUS.md` and skip.
- **DO NOT touch `/api/webhooks/stripe/route.ts` or `/api/webhooks/lessonspace/route.tsx`** — the user explicitly deferred event-id dedupe (Stripe) and signature verification (LessonSpace).
- **DO NOT push to remote** under any circumstances.
- **DO NOT do destructive git ops** (`reset --hard`, `clean -f`, `branch -D`, force-push).
- **DO NOT edit `docs/api-contract.md`, `docs/api-auth.md`, `docs/api-ownership.md`** — those are the spec.
- **DO NOT regenerate DB types** via `npm run gen-types` without surfacing — it can introduce churn.
- Commit messages: **no Claude / "Co-Authored-By" credit.**

## What's a "behavioural decision" you should stop on

Mechanical fixes you do yourself:
- Update consumer to read `data.students` instead of `data` (response shape).
- Read `res.status === 404` instead of `body.status === 404`.
- Delete an unused import.
- Rename a typed variable to match new shape.

Behavioural decisions you stop on:
- A component that consumes a now-wrapped response, but its existing logic would silently break (e.g., `data.length` instead of `data.students.length` — was checking array length; would now return undefined; type system might not catch).
- A test in `tests/` that expects the OLD shape. Don't touch tests.
- Any place where the right fix is "delete this old code" but it's not obvious whether the feature is still used.
- A `// TODO` or `// AUDIT` comment that suggests a deeper fix.

Note these in `PHASE6_STATUS.md`. Don't guess.

---

## Final smoke test checklist (for the user when they return)

These need eyes, not types. After all the type errors are cleared, the user should manually click through:

**Admin dashboard:**
- Students list loads, edit modal opens, save works.
- Employees (coaches) list loads, edit works.
- Courses list, add course, add lesson within course, lessons reorder.
- Payment-plans list (Stripe enrichment displays), add plan, archive plan.
- Assignments list, create assignment, delete assignment.
- Pending bookings: list shows pending, click preview → preview calendar renders, click approve.

**Coach dashboard:**
- Students list.
- Lesson page: feedback + progress save (the cascade should still award/remove tokens and badges).
- Conversation with student: opens, send message, sees own + student's messages.
- LessonSpace launch link works.
- Sessions calendar.

**Parent dashboard:**
- Students list shows subscription status.
- Open student detail.
- Edit student availability (the form submits a different shape now — `{ availability, timezone }`).

**Family flows:**
- Profile selection — pick a no-PIN parent profile (used to be `<a href>`, now `<form>` with selectProfile action).
- Profile selection — pick a no-PIN student profile.
- Profile selection — pick a PIN-protected parent profile.
- Checkout — does NOT take `password` anymore (was a security leak); new-account checkout flow should still work.

**Webhooks:**
- Stripe CLI: `stripe trigger invoice.paid` — student_subscriptions row appears.
- LessonSpace webhook: POST a fake summary — email lands in `wdstalkmaze@gmail.com` (this is the documented interim recipient).

---

## Stretch goal (only if everything above lands clean)

If Phase 6 finishes with time left in the agent's session, the audit's remaining MEDIUM follow-ups (which need to wait on RPC migrations) are tracked in `docs/test-rewrite-runbook.md`. **Don't start any of them** without the user's go-ahead — leave them for a future PR.
