---
name: Teachworks Removal Gap Analysis
description: Full audit of Teachworks usage and DB gaps that must be filled before removing it
type: project
---

# Teachworks Removal — Gap Analysis

## What Teachworks Is Currently Used For

| Feature | Files Involved |
|---------|---------------|
| Scheduled sessions (calendar) | `app/(protected)/calendar/page.tsx`, `app/(protected)/parent/page.tsx`, `app/(protected)/home/page.tsx` |
| Creating students on signup | `app/(public)/onboarding/actions.ts`, `lib/profile-management/addProfile.ts` |
| Creating coaches (admin action) | `app/api/admin/create-coach/route.ts` |
| Creating parent families on signup | `app/(public)/signup/actions.ts` |
| Recording payments | `app/api/webhooks/stripe/route.ts` — syncs Stripe invoices → Teachworks |
| Course/subject CRUD sync | `app/api/admin/courses/[id]/route.ts` |

## DB Fields Linking to Teachworks

| Table | Field | Purpose |
|-------|-------|---------|
| `account` | `tw_customer_id` | Family's Teachworks customer ID |
| `students` | `tw_id` | Teachworks student ID — used to fetch scheduled lessons |
| `coaches` | `tw_id` | Teachworks employee ID — set on coach creation |
| `parents` | `tw_id` | Teachworks customer ID |

---

## Gaps: New DB Objects Needed

### GAP 1 — Sessions / Scheduled Appointments (CRITICAL)
Teachworks is the entire scheduling system. Calendar and parent dashboard fetch live lesson schedules from it. The current DB has **no sessions table**.

**New tables needed:**
```sql
sessions (
  id, coach_id → coaches, title, starts_at, ends_at,
  duration_minutes, status, location_name, notes,
  created_at, updated_at
)

session_students (
  session_id → sessions, student_id → students
)
```

Teachworks `status` values: scheduled / completed / cancelled / no-show

---

### GAP 2 — Student Profile Fields (HIGH)
Current `students` table only has `name`, `Student_Plan`, `tw_id`, `remaining_lessons`. Onboarding collects more but it all went to Teachworks only.

**Missing fields to add to `students`:**
- `grade`
- `school`
- `phone_number`
- `birth_date`
- `address`
- `timezone`

---

### GAP 3 — Coach Profile Fields (MODERATE)
`coaches` table only has `name` and `tw_id`. All profile data was written to Teachworks only.

**Missing fields to add to `coaches`:**
- `phone_number`
- `bio`
- `photo_url`
- `subjects` / specialties
- `status` (active / inactive)

---

### GAP 4 — Coach Availability Table (MODERATE)
API route at `app/api/admin/employees/[id]/availability/route.ts` reads/writes availability to Supabase, but **no availability table exists in `database.ts`**. Either out of sync or incomplete.

**Table needed:**
```sql
coach_availability (
  id, coach_id → coaches, day_of_week, start_time, end_time
)
```

---

### GAP 5 — Payment Records (MODERATE)
Stripe webhook syncs paid invoices to Teachworks for billing reconciliation. Once removed, payment history only lives in Stripe.

**New table needed:**
```sql
payments (
  id, account_id → account, student_id → students,
  plan_id → plans, amount_cents, stripe_invoice_id,
  paid_at, description
)
```

---

## What Is Already Fine (No Gaps)

| Feature | Tables |
|---------|--------|
| Courses & curriculum lessons | `courses`, `lessons`, `lesson_progress` |
| Messaging | `conversations`, `messages` |
| Badges & rewards | `badges`, `student_badges` |
| Subscription plans | `plans` |
| Auth & accounts | Supabase Auth + `account` |
| Parent profile | `parents` (reasonably complete) |

---

## Files to Delete After Removal

- `lib/teachworks/client.ts`
- `lib/teachworks/types.ts`
- `app/api/teachworks/` (entire directory)
- `test-teachworks.js`

## Code Changes Required

1. `app/(public)/signup/actions.ts` — remove `postFamily()` call, drop `tw_customer_id` storage
2. `app/(public)/onboarding/actions.ts` — remove `createStudent()` Teachworks call, save student fields to Supabase instead
3. `lib/profile-management/addProfile.ts` — remove Teachworks client, write directly to Supabase
4. `app/api/admin/create-coach/route.ts` — remove `createEmployee()` call, drop `tw_id` storage
5. `app/api/admin/courses/[id]/route.ts` — remove Teachworks course sync
6. `app/api/webhooks/stripe/route.ts` — replace `createPayment()` with insert to new `payments` table
7. `app/(protected)/calendar/page.tsx` — replace `/api/teachworks/lessons` with `/api/sessions`
8. `app/(protected)/parent/page.tsx` — replace `/api/teachworks/family-lessons` with own endpoint
9. `app/(protected)/home/page.tsx` — replace commented-out Teachworks fetch with sessions query
10. `app/(protected)/coach/components/StudentDetails.tsx` — remove display of `tw_id`

## Cleanup: DB Columns to Drop
- `account.tw_customer_id`
- `students.tw_id`
- `coaches.tw_id`
- `parents.tw_id`
