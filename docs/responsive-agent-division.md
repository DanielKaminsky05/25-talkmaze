# Responsive Agent Division

How to split the responsive sweep across parallel agents without file-write collisions. Companion to `docs/responsive-spec.md`, `docs/responsive-page-fixtures.md`, and `.claude/agents/responsive-fix.md`.

The shape: **one sequential "shell pass" first**, then **five route-group agents in parallel**, each isolated in its own git worktree. Six agents total.

The division is by **shell + route subtree**, because that's where the real shared files live:

- Each shell (`(public)`, `(families)`, `coach/`, `admin/`) has a `layout.tsx` and a top-level `_components/` directory whose contents are imported by every page in that shell. Two agents both editing `CoachNavbar.tsx` = merge conflict.
- Pages within a subtree share a route-local `_components/` that no other subtree imports — those are safe to give to a single agent.

Run Wave 0 to completion and merge before starting Wave 1.

---

## Wave 0 — Shell pass (sequential, 1 agent)

This agent fixes everything that is "shared infrastructure within a shell" so the page agents in Wave 1 can stay strictly inside their own route subtree. After this lands, no Wave 1 agent should ever need to touch a `layout.tsx` or a shell-level `_components/` file.

### Owns (may edit)

```
src/app/layout.tsx
src/app/(protected)/(families)/layout.tsx
src/app/(protected)/(families)/_components/**          ← ALL of it: nav, shell, shared family widgets
src/app/(protected)/(families)/message/layout.tsx
src/app/(protected)/(families)/profiles/layout.tsx
src/app/(protected)/coach/layout.tsx
src/app/(protected)/coach/_components/CoachNavbar.tsx
src/app/(protected)/coach/_components/ui/**            ← StatusBadge, ExternalLinkIcon — shell-level UI
src/app/(protected)/admin/layout.tsx
src/app/(protected)/admin/_components/Avatar.tsx
src/app/(protected)/admin/_components/Pagination.tsx
src/app/(protected)/admin/_components/EmptyDetail.tsx
src/app/(protected)/admin/_components/CreateAdminModal.tsx
src/app/(protected)/admin/_components/AssignStudentDropDown.tsx
src/app/(protected)/admin/_components/StudentTable.tsx
src/app/(protected)/admin/_components/AdminCalendar.tsx
```

### Must NOT edit
Anything under a leaf route directory (those belong to a Wave 1 agent). If a fix requires editing a leaf `_components/` file, punt it to the right Wave 1 agent.

### Verification routes (sample each shell after the fix)
- `/login`, `/payments` (no shell, sanity only)
- `/parent`, `/student`, `/lessons` (families shell)
- `/coach`, `/coach/calendar` (coach shell)
- `/admin`, `/admin/students` (admin shell)

---

## Wave 1 — Route-group agents (5 in parallel, one worktree each)

Each agent owns its routes + the `_components/` colocated under those routes only. None of them edit shell-level files (Wave 0 territory) or each other's subtree.

### Agent A — Public, auth, payments (9 routes)

**Routes**
```
/                              src/app/page.tsx
/login                         src/app/(public)/login/page.tsx
/signup                        src/app/(public)/signup/page.tsx
/signup/account-created        src/app/(public)/signup/account-created/page.tsx
/forgot-password               src/app/(public)/forgot-password/page.tsx
/reset-password                src/app/(public)/reset-password/page.tsx
/payments                      src/app/(public)/payments/page.tsx
/payments/checkout             src/app/(public)/payments/checkout/page.tsx
/payments/success              src/app/(public)/payments/success/page.tsx
```

**Owns**
```
src/app/page.tsx
src/app/(public)/login/**
src/app/(public)/signup/**
src/app/(public)/forgot-password/**
src/app/(public)/reset-password/**
src/app/(public)/payments/page.tsx
src/app/(public)/payments/checkout/**
src/app/(public)/payments/success/**
src/app/(public)/payments/_components/**     ← payments-only shared, fine for one agent
```

**Punt if you'd touch:** anything outside `(public)/` or `src/app/page.tsx`.

---

### Agent B — Parent dashboard, profiles, onboarding (10 routes)

**Routes**
```
/profiles                                 src/app/(protected)/(families)/profiles/page.tsx
/profiles/add-student                     .../profiles/add-student/page.tsx
/profiles/new-user-setup                  .../profiles/new-user-setup/page.tsx
/onboarding                               .../onboarding/page.tsx
/parent                                   .../parent/page.tsx
/parent/profile                           .../parent/profile/page.tsx
/parent/lessons                           .../parent/lessons/page.tsx
/parent/lessons/[studentId]               .../parent/lessons/[studentId]/page.tsx
/parent/sessions                          .../parent/sessions/page.tsx
```

(`/profiles` listed once — picker + add + setup all under `/profiles/`.)

**Owns**
```
src/app/(protected)/(families)/profiles/**     EXCEPT layout.tsx
src/app/(protected)/(families)/onboarding/**
src/app/(protected)/(families)/parent/**
```

**Punt if you'd touch:**
- `(families)/layout.tsx` or `(families)/_components/**` (Wave 0)
- `(families)/profiles/layout.tsx` (Wave 0)
- Anything under `student/`, `lessons/`, `message/`, `reward/` (Agent C)

---

### Agent C — Student dashboard, lessons, messaging, reward (7 routes)

**Routes**
```
/student                       src/app/(protected)/(families)/student/page.tsx
/student/profile               .../student/profile/page.tsx
/lessons                       .../lessons/page.tsx
/lessons/[slug]                .../lessons/[slug]/page.tsx
/message                       .../message/page.tsx
/message/[id]                  .../message/[id]/page.tsx
/reward                        .../reward/page.tsx
```

**Owns**
```
src/app/(protected)/(families)/student/**
src/app/(protected)/(families)/lessons/**
src/app/(protected)/(families)/message/**      EXCEPT layout.tsx
src/app/(protected)/(families)/reward/**
```

**Punt if you'd touch:**
- `(families)/layout.tsx` or `(families)/_components/**` (Wave 0)
- `(families)/message/layout.tsx` (Wave 0)
- Anything under `parent/`, `profiles/`, `onboarding/` (Agent B)

**Heads-up:** This slice owns the Tiptap-heavy `/lessons/[slug]` and the FullCalendar-adjacent message layouts. Pin §4 component patterns from the spec — Tiptap toolbar wraps, no buttons hidden.

---

### Agent D — Coach (6 routes)

**Routes**
```
/coach                                                src/app/(protected)/coach/page.tsx
/coach/calendar                                       .../coach/calendar/page.tsx
/coach/reschedule-requests                            .../coach/reschedule-requests/page.tsx
/coach/students/[studentId]                           .../coach/students/[studentId]/page.tsx
/coach/students/[studentId]/lessons                   .../coach/students/[studentId]/lessons/page.tsx
/coach/students/[studentId]/lessons/[lessonId]        .../coach/students/[studentId]/lessons/[lessonId]/page.tsx
```

**Owns**
```
src/app/(protected)/coach/page.tsx
src/app/(protected)/coach/calendar/**
src/app/(protected)/coach/reschedule-requests/**
src/app/(protected)/coach/students/**
src/app/(protected)/coach/_components/MyStudents.tsx
src/app/(protected)/coach/_components/AssignCourseModal.tsx
src/app/(protected)/coach/_components/LessonsTable.tsx
src/app/(protected)/coach/_components/StudentDetails.tsx
src/app/(protected)/coach/_components/student-details/**
src/app/(protected)/coach/_components/students-list/**
```

**Punt if you'd touch:**
- `coach/layout.tsx`, `coach/_components/CoachNavbar.tsx`, `coach/_components/ui/**` (Wave 0)

**Heads-up:** `/coach/calendar` is the FullCalendar bug magnet — apply §4 (timeGridDay default below tablet).

---

### Agent E — Admin (7 routes)

**Routes**
```
/admin                         src/app/(protected)/admin/page.tsx
/admin/pending                 .../admin/pending/page.tsx
/admin/assignments             .../admin/assignments/page.tsx
/admin/coaches                 .../admin/coaches/page.tsx
/admin/courses                 .../admin/courses/page.tsx
/admin/payment-plans           .../admin/payment-plans/page.tsx
/admin/students                .../admin/students/page.tsx
```

**Owns**
```
src/app/(protected)/admin/page.tsx
src/app/(protected)/admin/pending/**
src/app/(protected)/admin/assignments/**
src/app/(protected)/admin/coaches/**
src/app/(protected)/admin/courses/**
src/app/(protected)/admin/payment-plans/**
src/app/(protected)/admin/students/**
```

**Punt if you'd touch:**
- `admin/layout.tsx` or any of the shell-level `admin/_components/` files listed in Wave 0

**Heads-up:** Tables everywhere. §4 says wrap in `overflow-x-auto` below tablet — do not collapse columns or stack rows.

---

## Cross-agent collision matrix

After Wave 0 lands, no two Wave 1 agents share a directory. The only theoretical overlap was the `(families)/` shell, which is fully owned by Wave 0:

| Shared concern | Owner | Why |
|---|---|---|
| `app/layout.tsx` | Wave 0 | Root layout, body classes |
| `(families)/layout.tsx` + `_components/` | Wave 0 | Sidebar, nav, profile switcher used by B and C |
| `coach/layout.tsx` + `CoachNavbar` + `ui/` | Wave 0 | Used by every coach page in D |
| `admin/layout.tsx` + shell `_components/` | Wave 0 | Avatar/Pagination/EmptyDetail/StudentTable used across every admin route in E |
| `(public)/payments/_components/` | Agent A | Only Agent A touches `(public)/`, no cross-agent overlap |
| `(families)/parent/**` | Agent B | C does not import these |
| `(families)/{student,lessons,message,reward}/**` | Agent C | B does not import these |
| `coach/students/**` + non-shell `coach/_components/` | Agent D | Single shell owner |
| `admin/**/(non-shell-_components)` | Agent E | Single shell owner |

---

## Orchestration

1. **Wave 0**: spawn one agent on a `responsive-shell-pass` branch. Review + merge.
2. **Update everyone's main**: every Wave 1 worktree branches from the post-Wave-0 commit, so the shell fixes are already in place.
3. **Wave 1**: spawn Agents A–E in parallel, one git worktree each. Each gets:
   - This doc + `docs/responsive-spec.md` + `docs/responsive-page-fixtures.md`.
   - Their **Owns** path list as a hard constraint.
   - Their **Punt if you'd touch** list as a hard constraint.
   - Their route list as the to-do.
4. **Merge order doesn't matter** for Wave 1 (no shared files), but merge them one at a time so a regression is bisectable to a single agent's PR.

---

## When an agent finds shell work mid-flight

A Wave 1 agent that discovers a shell-level fix is needed (e.g. the sidebar overflows on mobile) **stops, reports it as a punted item, and moves on**. The orchestrator either:

- Re-spawns Wave 0 with a small patch list, or
- Files it as a follow-up and accepts that Wave 1 PRs leave that bug in place.

Do not let a Wave 1 agent "just quickly fix" a shell file. That's exactly the collision the division exists to prevent.
