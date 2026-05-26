-- Multi-course support: each student can now have multiple active
-- course_assignment rows. active_course_id denormalises a single "currently
-- selected" course on the student row so the family-side UI (student home,
-- /lessons, parent dashboards) can render a deterministic single-course view
-- and let the student switch via a picker.
--
-- ON DELETE SET NULL because courses being deleted is not the student's
-- problem — surface a "no course selected" state rather than failing the
-- query.
--
-- The column is nullable both for new students (no assignments yet) and for
-- the picker's "no active course" idle state.

ALTER TABLE "public"."students"
  ADD COLUMN IF NOT EXISTS "active_course_id" uuid
    REFERENCES "public"."courses"("id") ON DELETE SET NULL;

-- Backfill: for every existing student who has at least one active
-- course_assignment, pick the most recently assigned one as their active
-- course. Students without active assignments stay NULL.
UPDATE "public"."students" s
SET "active_course_id" = ca."course_id"
FROM (
  SELECT DISTINCT ON ("student_id") "student_id", "course_id"
  FROM "public"."course_assignment"
  WHERE "isActive" = true
  ORDER BY "student_id", "created_at" DESC
) ca
WHERE s."id" = ca."student_id"
  AND s."active_course_id" IS NULL;
