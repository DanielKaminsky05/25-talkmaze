# Coach-Student Matchmaking

`assignCoachToStudent(student_id, num_classes)` in [app/(public)/onboarding/actions.ts](../app/(public)/onboarding/actions.ts)

Triggered by the Stripe `invoice.paid` webhook after a successful checkout. Takes a student ID and the number of sessions purchased, finds a coach/time, and creates a pending recurring booking for admin approval.

The current flow is:

```text
User pays -> matcher finds coach/time -> booked_slots row is created as pending -> admin approves -> sessions are generated and the booked slot becomes active
```

---

## Overview

The scheduling flow has three phases:

1. **Anchor search** - find a single concrete date/time that works for both the student and a coach.
2. **Pending booking** - store the matched recurring slot in `booked_slots` with `status = "pending"` and `num_sessions`.
3. **Admin approval** - when an admin approves, create concrete `sessions`, activate the booked slot, and link the coach/student pair.

Pending bookings do not block matchmaking. Only `booked_slots.status = "active"` counts as a permanent recurring conflict.

---

## Phase 1: Anchor Search

### Inputs

- `student_availabilities` - the student's weekly availability windows (weekday + HH:mm:ss start/end + timezone), set during onboarding.
- `coach_availabilities` - every coach's weekly availability windows.
- `booked_slots` - active recurring reservations already held by coaches and students.
- `sessions` - concrete one-off session records (used to catch manually-scheduled one-offs).

### Step-by-step

**1. Shuffle student slots**

The student's availability slots are shuffled randomly before iteration. This distributes new students across different days of the week rather than always filling Monday first.

**2. For each student slot, find the next matching calendar date**

Starting from tomorrow, the algorithm walks forward until it lands on the correct weekday for that slot (e.g. next Monday).

**3. Generate candidate start times within the slot**

Within the student's availability window (e.g. 2 PM-5 PM), the algorithm generates all possible 1-hour session start times stepped by 10 minutes (2:00, 2:10, 2:20 ... 4:00 PM). Start times are snapped to the nearest 10-minute boundary. A slot shorter than 1 hour is skipped.

**4. For each candidate time, check student conflicts**

The candidate UTC time is compared against the student's active `booked_slots`. Each active booked slot is reconstructed as a concrete UTC range for the candidate date (using wall-clock time + timezone), then checked for overlap. If the student is already permanently booked at this time, the candidate is skipped.

**5. For each candidate time, find a free coach**

Coaches are shuffled (round-robin load balancing) and checked in order. A coach passes if all conditions hold:

- **Weekday match** - the candidate UTC time falls on the coach's working weekday in the coach's timezone.
- **Window match** - the candidate falls within the coach's declared start/end times in their timezone.
- **No active recurring conflict** - the coach's active `booked_slots` do not overlap the candidate.
- **No one-off conflict** - the coach's `sessions` table has no overlapping record.

The student's `sessions` are also checked for one-off conflicts.

**6. Create pending booking**

The first candidate that satisfies all checks becomes the matched slot. A `booked_slots` row is inserted with:

- `status = "pending"`
- `num_sessions = num_classes`

No `sessions` rows are created at this point.

---

## Phase 2: Admin Approval

Pending bookings appear in the admin dashboard's Pending tab. Admins can approve a pending booking. There is intentionally no reject flow; unwanted pending rows can remain pending.

On approval:

1. Fetch the pending `booked_slots` row.
2. Re-check conflicts against active `booked_slots`.
3. Re-check concrete `sessions` conflicts while generating future weekly sessions.
4. Insert `num_sessions` session rows.
5. Update the booked slot to `status = "active"`.
6. Insert the `coach_students` junction if it does not already exist.

If the slot now conflicts with an active booking or cannot generate all requested sessions, approval fails and the booking stays pending.

**DST handling:** Rather than adding weeks directly to a UTC timestamp, the algorithm re-interprets the wall-clock time in the booked slot's timezone for each target date. This means a student booked at 3 PM stays at 3 PM locally, regardless of DST transitions.

---

## Database Tables

| Table | Purpose |
|---|---|
| `student_availabilities` | Weekly recurring availability windows per student |
| `coach_availabilities` | Weekly recurring availability windows per coach |
| `booked_slots` | Pending and active recurring reservations, including `num_sessions` |
| `sessions` | Concrete scheduled session instances (UTC start/end) |
| `coach_students` | Junction table linking coaches to their students |

### Time storage

- **`booked_slots`** stores times as `HH:mm:ss` strings in the originating timezone. Collision checks reconstruct UTC per specific date so DST is handled correctly.
- **`sessions`** stores times as UTC ISO 8601 strings. All display-layer components convert to the viewer's local timezone.

---

## Failure Modes

| Situation | Outcome |
|---|---|
| Student has no availability configured | Returns 400 |
| No coaches in the database | Returns 200 with `success: false` |
| No free coach/time found | Returns 200 with `success: false` |
| Pending `booked_slots` insert fails | Returns 500 |
| Approval conflicts with active recurring booking | Returns 409 and leaves booking pending |
| Approval cannot generate all requested sessions | Returns 409 and leaves booking pending |
| Session bulk insert fails | Returns 500 |
