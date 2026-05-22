# Responsive Page Fixtures

One-row-per-route map of which storageState (role) to use and what selector to wait on before screenshotting. Companion to `docs/responsive-spec.md` and `scripts/screenshots/capture.ts`.

If a row is wrong, fix it here — agents read this table, not the code. If a route is missing, add it before screenshotting (don't guess the role from the URL — `/profiles` is reachable by `parent` but not by `coach`, etc).

---

## Running the screenshot pipeline

```
# one-time
npx playwright install chromium
supabase start

# every session — dev server must use local Supabase, not .env.local's remote
npm run screenshots:dev     # not `npm run dev` (that uses .env.local → remote DB)
npm run screenshots:setup   # writes tests/screenshots/states/{parent,student,coach,admin}.json

# pre-warm Next dev's lazy route compilation (one-time per dev session)
MSYS_NO_PATHCONV=1 npm run screenshots:warm -- --routes=tests/screenshots/routes.example.json

# per route (Windows Git Bash: prepend MSYS_NO_PATHCONV=1 so /coach doesn't get
# mangled into C:/Program Files/Git/coach)
MSYS_NO_PATHCONV=1 npm run screenshots:page -- --role=coach --path=/coach --ready=body

# only some breakpoints (useful for mobile-only fixes)
MSYS_NO_PATHCONV=1 npm run screenshots:page -- --role=coach --path=/coach --ready=body --breakpoints=mobile-sm,mobile-lg

# batch: capture N routes in ONE browser process (much faster than N invocations)
MSYS_NO_PATHCONV=1 npm run screenshots:batch -- --routes=tests/screenshots/routes.example.json
```

`screenshots:dev` runs `dotenv -e .env.test -- next dev` so the dev server reads the local Supabase keys. Your normal `npm run dev` is unchanged and still points at remote.

`screenshots:warm` and `screenshots:batch` both read the same JSON format: an array of `{ role, path, ready?, breakpoints?, settleMs? }`. See `tests/screenshots/routes.example.json` for a starter — copy and trim to your slice.

---

## How to read this table

| Column | Meaning |
|---|---|
| Route | Path you pass to `--path=` |
| Role | `--role=` value. Which storageState to load |
| Ready selector | `--ready=` value. CSS selector that means "page is mounted with data" |
| Seed-sensitive | Whether the page renders meaningful UI only when the DB has specific seed data (beyond what `setup-states.ts` already creates) |

The base seed from `setup-states.ts` gives you: 1 parent + 1 student (with active subscription on the default plan) + 1 coach + 1 admin. Routes flagged **seed-sensitive** need additional rows (booked slots, sessions, lessons, courses, etc.) before the responsive bug is even *visible* — empty states don't overflow.

---

## Public routes (no role required, but `parent` state works fine)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/` | — | `body` | no | Landing page |
| `/login` | — | `form` | no | Public |
| `/signup` | — | `form` | no | Public |
| `/forgot-password` | — | `form` | no | Public |
| `/reset-password` | — | `form` | no | Reachable from email link only; layout still inspectable |
| `/payments` | `student` | `body` | no | Student-without-sub lands here via middleware; using `student` state means an *active* sub, so this renders the paid view |
| `/payments/checkout` | `student` | `[data-stripe-loaded], form` | yes | Stripe Elements iframe; readiness is approximate |
| `/payments/success` | `student` | `body` | no | Post-checkout confirmation |
| `/signup/account-created` | — | `body` | no | Post-signup confirmation |

---

## Family routes (`parent` or `student` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/profiles` | `parent` | `[role=button], button` | no | Profile picker. Use `parent` state's pre-selectProfile cookie? **No** — capture this with a state that has the user logged in but no active profile (TODO: add `parent-unselected.json` if needed) |
| `/profiles/add-student` | `parent` | `form` | no | |
| `/profiles/new-user-setup` | `parent` | `form` | no | First-run flow |
| `/onboarding` | `parent` | `body` | no | |
| `/parent` | `parent` | `body` | no | Parent dashboard |
| `/parent/lessons` | `parent` | `body` | yes | Empty without student/lessons |
| `/parent/lessons/[studentId]` | `parent` | `body` | yes | Needs a real student id in URL |
| `/parent/profile` | `parent` | `form` | no | |
| `/parent/sessions` | `parent` | `body` | yes | Empty without `sessions` rows |
| `/student` | `student` | `body` | no | Student dashboard. **Requires active subscription** — `student` state has one |
| `/student/profile` | `student` | `form` | no | |
| `/lessons` | `student` | `body` | yes | Empty without `lessons` rows |
| `/lessons/[slug]` | `student` | `.ProseMirror, body` | yes | Tiptap editor mounts here; `.ProseMirror` is its rendered root |
| `/message` | `student` | `body` | yes | Conversation list — the contacts dropdown is focus-triggered (clicking the search bar opens it), so screenshots without interaction show only "Select a contact" |
| `/message/[id]` | `student` | `body` | yes | `[id]` is the **coach's `account_id`** (not the `conversation.id`). Resolve via `SELECT account_id FROM coaches LIMIT 1`. Visiting as a different profile than the seeded conversation auto-creates a new empty conversation rather than showing the seeded messages — by design |
| `/reward` | `student` | `body` | yes | Token/reward UI — looks blank without `tokens`/`student_tokens` rows |

---

## Coach routes (`coach` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/coach` | `coach` | `body` | no | Coach dashboard |
| `/coach/calendar` | `coach` | `.fc-view-harness` | partly | FullCalendar root. Layout is testable without sessions, but empty events hide week/day overflow bugs |
| `/coach/students/[studentId]` | `coach` | `body` | yes | Needs `coach_students` link + student id |
| `/coach/students/[studentId]/lessons` | `coach` | `body` | yes | Needs lessons |
| `/coach/students/[studentId]/lessons/[lessonId]` | `coach` | `.ProseMirror, body` | yes | Tiptap; needs lesson id |

---

## Admin routes (`admin` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/admin` | `admin` | `body` | no | |
| `/admin/pending` | `admin` | `body` | yes | Lists pending `booked_slots` — empty by default |
| `/admin/assignments` | `admin` | `body` | yes | |
| `/admin/coaches` | `admin` | `body` | yes | Table is empty without `coaches` rows beyond the seed |
| `/admin/courses` | `admin` | `body` | yes | |
| `/admin/payment-plans` | `admin` | `body` | partly | Has the seeded plan; more rows show wrapping issues |
| `/admin/students` | `admin` | `body` | yes | |

---

## Notes on seed-sensitivity

A page flagged **seed-sensitive** can still be screenshot — but the screenshot will show an empty state, not the layout that breaks under realistic data. If the responsive sweep is about "make tables wrap on mobile," empty tables won't tell you anything.

Two options for seed-heavy pages:

1. **Extend `setup-states.ts`** to insert representative rows (e.g. 5 students per coach, 8 sessions, 3 lessons per student). Cheapest if a handful of pages need it.
2. **Per-route seed scripts** under `scripts/screenshots/seeds/<route>.ts` that the agent runs before screenshotting that route. Use this if seeds collide (one route wants 0 sessions, another wants 50).

This document doesn't prescribe one — start with option 1, fall back to option 2 if the unified seed gets unwieldy.

---

## Adding a new route

1. Find the page file: `src/app/<group>/<path>/page.tsx`.
2. Pick the lowest-privilege role that can reach it (per `src/middleware.ts`).
3. Decide the readiness selector by reading the page — `body` is the safe default; prefer something more specific (`.fc-view-harness`, `.ProseMirror`, a data-attribute on a known mount point) if the page has async data, a calendar, or an editor. Note that `<main>` is NOT reliably present — several shells render a `<div>` root instead.
4. Add a row to the right table above. One line, no prose.
5. Run `npm run screenshots:page -- --role=X --path=/Y --ready=Z` to confirm it captures correctly.
