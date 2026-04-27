# Coach–Student Matchmaking

`assignCoachToStudent(student_id, num_classes)` in [app/(public)/onboarding/actions.ts](../app/(public)/onboarding/actions.ts)

Triggered by the Stripe `invoice.paid` webhook after a successful checkout. Takes a student ID and the number of sessions purchased, then finds a coach, reserves the recurring slot, and bulk-creates all session records.

---

## Overview

The algorithm has two phases:

1. **Anchor search** — find a single concrete date/time that works for both the student and a coach.
2. **Session generation** — extrapolate that anchor across `num_classes` weekly occurrences.

---

## Phase 1: Anchor Search

### Inputs

- `student_availabilities` — the student's weekly availability windows (weekday + HH:mm:ss start/end + timezone), set during onboarding.
- `coach_availabilities` — every coach's weekly availability windows.
- `booked_slots` — permanent recurring reservations already held by coaches and students.
- `sessions` — concrete one-off session records (used to catch manually-scheduled one-offs).

### Step-by-step

**1. Shuffle student slots**

The student's availability slots are shuffled randomly before iteration. This distributes new students across different days of the week rather than always filling Monday first.

**2. For each student slot, find the next matching calendar date**

Starting from tomorrow, the algorithm walks forward until it lands on the correct weekday for that slot (e.g., next Monday).

**3. Generate candidate start times within the slot**

Within the student's availability window (e.g., 2 PM–5 PM), the algorithm generates all possible 1-hour session start times stepped by 10 minutes (2:00, 2:10, 2:20 … 4:00 PM). Start times are snapped to the nearest 10-minute boundary. A slot shorter than 1 hour is skipped.

**4. For each candidate time, check student conflicts**

The candidate UTC time is compared against the student's existing `booked_slots`. Each booked slot is reconstructed as a concrete UTC range for the candidate date (using wall-clock time + timezone), then checked for overlap. If the student is already permanently booked at this time, the candidate is skipped.

**5. For each candidate time, find a free coach**

Coaches are shuffled (round-robin load balancing) and checked in order. A coach passes if all three conditions hold:

- **Weekday match** — the candidate UTC time falls on the coach's working weekday in the coach's timezone.
- **Window match** — the candidate falls within the coach's declared start/end times in their timezone (string comparison on `HH:mm:ss`).
- **No permanent conflict** — the coach's `booked_slots` don't overlap the candidate (same per-date UTC reconstruction as the student check above).
- **No one-off conflict** — the coach's `sessions` table has no overlapping record.

The student's `sessions` are also checked for one-off conflicts.

**6. Lock the anchor**

The first candidate that satisfies all checks becomes the **anchor**: a concrete UTC timestamp + matched coach + exact start/end time. The outer loops break immediately.

If no anchor is found across all student slots, the function returns `{ success: false }` and the Stripe webhook completes without crashing (a 200 is returned so Stripe doesn't retry, but an admin alert should be triggered).

---

## Phase 2: Session Generation

Once an anchor is found, a `booked_slots` record is inserted first to permanently reserve the recurring weekly slot for both the coach and the student.

Sessions are then generated one week at a time until `num_classes` are booked:

```
for each week offset (0, 1, 2, ...):
  reconstruct the session's UTC time from wall-clock anchor + offset
  check for any collision in the sessions table for this coach
  if clear → add to batch
  if blocked → skip this week, try next
```

**DST handling:** Rather than adding weeks directly to the anchor UTC timestamp (which would keep UTC fixed but drift the local display time), the algorithm re-interprets the wall-clock time in the student's timezone for each target date. This means a student booked at 3 PM always sees 3 PM, regardless of DST transitions.

A hard cap of `num_classes × 3` weeks prevents infinite loops if the coach's calendar is heavily blocked.

All sessions passing the collision check are bulk-inserted into `sessions`. The coach–student pair is then upserted into `coach_students`.

---

## Database Tables

| Table | Purpose |
|---|---|
| `student_availabilities` | Weekly recurring availability windows per student |
| `coach_availabilities` | Weekly recurring availability windows per coach |
| `booked_slots` | Permanent recurring reservations (wall-clock time + timezone) |
| `sessions` | Concrete scheduled session instances (UTC start/end) |
| `coach_students` | Junction table linking coaches to their students |

### Time storage

- **`booked_slots`** stores times as `HH:mm:ss` strings in the originating timezone. Collision checks reconstruct UTC per specific date so DST is handled correctly.
- **`sessions`** stores times as UTC ISO 8601 strings. All display-layer components convert to the viewer's local timezone.

---

## Failure modes

| Situation | Outcome |
|---|---|
| Student has no availability configured | Returns 400 |
| No coaches in the database | Returns 200 with `success: false` |
| No free coach/time found | Returns 200 with `success: false` (Stripe won't retry) |
| `booked_slots` insert fails | Returns 500 |
| Session bulk insert fails | Returns 500 |
