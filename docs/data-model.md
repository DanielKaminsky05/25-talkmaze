# Data Model

Source of truth: `src/services/supabase/types/database.ts` (auto-generated; regenerate via `npm run gen-types`).

## Tables (25)

`account`, `badges`, `booked_slots`, `coach_availabilities`, `coach_students`, `coaches`, `conversations`, `course_assignment`, `courses`, `lesson_progress`, `lesson_summaries`, `lesson_tasks`, `lessons`, `messages`, `parents`, `plans`, `session_attendance`, `sessions`, `student_availabilities`, `student_badges`, `student_subscriptions`, `student_tokens`, `students`, `tokens`.

## Entity groups

### Identity

- **`account`** — `(id, email, role, stripe_customer_id, new)`. Central auth entity, `id` = Supabase auth user id. `role` is a number: `1` = regular family user, `2` = coach, `3` = admin.
- **`parents`** — `(account_id, first_name, last_name, avatar_url, billing_email, bio, location, phone_number, profile_access_pin)`. One per family account. `profile_access_pin` is an optional plaintext PIN gating parent profile selection.
- **`coaches`** — `(account_id, first_name, last_name, avatar_url)`.
- **`students`** — `(account_id, first_name, last_name, avatar_url, date_of_birth, grade, bio, location, notes, is_setup_complete, post_lesson_days, post_lesson_tasks_enabled, lesson_space_id, lesson_space_student_link, lesson_space_teacher_link, webhook_room_id)`. Multiple students per family account. The `lesson_space_*` and `webhook_room_id` fields are the join keys for the video provider (see `lessonspace-runtime-flows.md`). A `teach_works_url` column still exists in the generated types but is no longer referenced by application code — drop it next migration.

There is no explicit `families` table — the parent↔students relationship is implicit via shared `account_id`.

### Coaching relationship

- **`coach_students`** — `(coach_id, student_id)` join. N:M. Maintained idempotently by `approvePendingBookedSlot()`.

### Courses & lessons

- **`courses`** — `(id, title, description, head_lesson_id, tail_lesson_id)`. Lessons form a linked list within a course via `lessons.prev_lesson` / `lessons.next_lesson`.
- **`lessons`** — `(id, course_id, title, description, prev_lesson, next_lesson, slug, content_url, slide_pptx_url, slide_show_url)`.
- **`course_assignment`** — `(student_id, course_id, isActive, progress)`. Student↔course enrollment with progress percentage.
- **`lesson_progress`** — `(id, student_id, lesson_id, status, completed_at, coach_notes, positive_feedback, improvement_feedback)`. `status` is numeric (0 = not started, 1 = in progress, 2 = completed).
- **`lesson_summaries`** — `(student_id, lesson_id, summary)`. Populated by the LessonSpace webhook.
- **`lesson_tasks`** — `(id, lesson_id, student_id?, type, description, file_url)`. Optional student override for personalised tasks.

### Sessions & scheduling

- **`sessions`** — `(id, coach_id, student_id, start_time, end_time, weekday)`. Concrete instances (UTC ISO timestamps).
- **`session_attendance`** — `(id, session_id, student_id, coach_id, session_date, status, notes)`. Per-session status string (e.g. `"attended"`, `"no-show"`, `"excused"`).
- **`coach_availabilities`**, **`student_availabilities`** — `(id, {coach,student}_id, weekday, start_time/start_time_new, end_time/end_time_new, timezone)`. Recurring weekly windows. Note the duplicated `_new` columns — there's an in-flight migration; check both when reading.
- **`booked_slots`** — `(id, coach_id, student_id, weekday, start_time, end_time, num_sessions?, start_date?, status, timezone)`. Recurring reservation bridging availability to sessions. `status ∈ {"pending", "active", ...}`. Only `"active"` blocks matchmaking. See `matchmaking.md`.

### Payments

- **`plans`** — `(id, name, type, classes, cents, currency, renewal, stripe_price_id, is_active, description)`. One row per Stripe price; `classes` is the number of included sessions.
- **`student_subscriptions`** — `(id, student_id, account_id, plan_id, status, sessions_remaining, current_period_start, current_period_end, cancelled_at, pending_plan_id, pending_effective_date, pending_stripe_schedule_id, pending_created_at)`. `pending_*` fields hold a scheduled plan change (Stripe `SubscriptionSchedule`). See `payments-flow.md`.

### Messaging

- **`conversations`** — `(id, coach_id, profile_id, profile_type, created_at)`. One conversation per `(coach, profile)` pair, where `profile_type ∈ {"student", "parent"}`.
- **`messages`** — `(id, conversation_id, sender_id, body, created_at, edited_at)`. `sender_id` FKs `account.id`. Authorization currently relies on the frontend supplying the right `conversation_id` — there's no visible RLS or server-side conversation-membership check (see `repo-quality-audit.md`).

### Rewards

- **`badges`** — `(id, course_id, title, image_url)`. Course-completion achievements.
- **`student_badges`** — `(student_id, badge_id, awarded_at, claimed_at)`.
- **`tokens`** — `(id, lesson_id?, title, code, description, icon_url)`. Generic mystery-token awards.
- **`student_tokens`** — `(student_id, token_id, awarded_at, badge_url)`.

## Common join paths

- Session → its student/coach: direct FKs.
- Coach's students: `coach_students` join (set by approval, not by `sessions`).
- Student's current plan: `student_subscriptions` filtered by `status = "active"`.
- LessonSpace webhook → student: `students` filtered by `webhook_room_id`.
- Family's students: `students` filtered by `account_id`.

## Notable enums / status fields

- `account.role`: `1` family / `2` coach / `3` admin.
- `booked_slots.status`: `"pending"` (created by matchmaker) / `"active"` (after admin approval) / cancelled states.
- `student_subscriptions.status`: tracks Stripe lifecycle (`"active"`, `"cancelled"`, etc.). `cancel_at_period_end` lives on Stripe, not this row — derive from `cancelled_at` being set while `status` stays active.
- `lesson_progress.status`: numeric (0/1/2).

