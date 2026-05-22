# Responsive Page Fixtures

One-row-per-route map of which storageState (role) to use and what selector to wait on before screenshotting. Companion to `docs/responsive-spec.md` and `scripts/screenshots/capture.ts`.

If a row is wrong, fix it here — agents read this table, not the code. If a route is missing, add it before screenshotting (don't guess the role from the URL — `/profiles` is reachable by `parent` but not by `coach`, etc).

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
| `/` | — | `main` | no | Landing page |
| `/login` | — | `form` | no | Public |
| `/signup` | — | `form` | no | Public |
| `/forgot-password` | — | `form` | no | Public |
| `/reset-password` | — | `form` | no | Reachable from email link only; layout still inspectable |
| `/payments` | `student` | `main` | no | Student-without-sub lands here via middleware; using `student` state means an *active* sub, so this renders the paid view |
| `/payments/checkout` | `student` | `[data-stripe-loaded], form` | yes | Stripe Elements iframe; readiness is approximate |
| `/payments/success` | `student` | `main` | no | Post-checkout confirmation |
| `/signup/account-created` | — | `main` | no | Post-signup confirmation |

---

## Family routes (`parent` or `student` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/profiles` | `parent` | `[role=button], button` | no | Profile picker. Use `parent` state's pre-selectProfile cookie? **No** — capture this with a state that has the user logged in but no active profile (TODO: add `parent-unselected.json` if needed) |
| `/profiles/add-student` | `parent` | `form` | no | |
| `/profiles/new-user-setup` | `parent` | `form` | no | First-run flow |
| `/onboarding` | `parent` | `main` | no | |
| `/parent` | `parent` | `main` | no | Parent dashboard |
| `/parent/lessons` | `parent` | `main` | yes | Empty without student/lessons |
| `/parent/lessons/[studentId]` | `parent` | `main` | yes | Needs a real student id in URL |
| `/parent/profile` | `parent` | `form` | no | |
| `/parent/sessions` | `parent` | `main` | yes | Empty without `sessions` rows |
| `/student` | `student` | `main` | no | Student dashboard. **Requires active subscription** — `student` state has one |
| `/student/profile` | `student` | `form` | no | |
| `/lessons` | `student` | `main` | yes | Empty without `lessons` rows |
| `/lessons/[slug]` | `student` | `.ProseMirror, main` | yes | Tiptap editor mounts here; `.ProseMirror` is its rendered root |
| `/message` | `student` | `main` | yes | Conversation list — empty without seeded `conversations` |
| `/message/[id]` | `student` | `main` | yes | Needs a real conversation id |
| `/reward` | `student` | `main` | yes | Token/reward UI — looks blank without `tokens`/`student_tokens` rows |

---

## Coach routes (`coach` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/coach` | `coach` | `main` | no | Coach dashboard |
| `/coach/calendar` | `coach` | `.fc-view-harness` | partly | FullCalendar root. Layout is testable without sessions, but empty events hide week/day overflow bugs |
| `/coach/students/[studentId]` | `coach` | `main` | yes | Needs `coach_students` link + student id |
| `/coach/students/[studentId]/lessons` | `coach` | `main` | yes | Needs lessons |
| `/coach/students/[studentId]/lessons/[lessonId]` | `coach` | `.ProseMirror, main` | yes | Tiptap; needs lesson id |

---

## Admin routes (`admin` state)

| Route | Role | Ready selector | Seed-sensitive | Notes |
|---|---|---|---|---|
| `/admin` | `admin` | `main` | no | |
| `/admin/pending` | `admin` | `main` | yes | Lists pending `booked_slots` — empty by default |
| `/admin/assignments` | `admin` | `main` | yes | |
| `/admin/coaches` | `admin` | `main` | yes | Table is empty without `coaches` rows beyond the seed |
| `/admin/courses` | `admin` | `main` | yes | |
| `/admin/payment-plans` | `admin` | `main` | partly | Has the seeded plan; more rows show wrapping issues |
| `/admin/students` | `admin` | `main` | yes | |

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
3. Decide the readiness selector by reading the page — `main` is fine for simple pages, prefer something more specific if the page has async data, a calendar, or an editor.
4. Add a row to the right table above. One line, no prose.
5. Run `npm run screenshots:page -- --role=X --path=/Y --ready=Z` to confirm it captures correctly.
