import "server-only";

import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import type { Database } from "@/src/services/supabase/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type ErrorShape = {
  error: string;
  status: number;
};

type ResolveErrors = {
  studentNotFound: ErrorShape;
  noActiveStudentProfile: ErrorShape;
  invalidActiveStudentProfile: ErrorShape;
};

type ResolveStudentIdForBillingParams = {
  supabase: SupabaseClient<Database>;
  accountId: string;
  requestedStudentId?: string;
  requireOwnedActiveProfileStudent?: boolean;
  errors?: Partial<ResolveErrors>;
};

type ResolveStudentIdForBillingResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string; status: number };

const DEFAULT_ERRORS: ResolveErrors = {
  studentNotFound: { error: "Student not found", status: 404 },
  noActiveStudentProfile: { error: "No active student profile", status: 400 },
  invalidActiveStudentProfile: {
    error: "Active student profile is invalid",
    status: 403,
  },
};

/**
 * Resolves which student a billing/subscription action should operate on.
 *
 * Behavior:
 * 1. If `requestedStudentId` is provided, verifies account ownership in `students`.
 * 2. Otherwise, falls back to the active profile cookie (`getActiveProfile()`).
 * 3. Optionally verifies the active profile student is owned by the account.
 *
 * The helper returns structured errors so each route can keep its own message/status
 * contract while sharing the same resolution logic.
 *
 * @param params Resolution inputs, ownership mode, and optional route-specific errors.
 * @returns `{ ok: true, studentId }` on success, or `{ ok: false, error, status }` on failure.
 */
export async function resolveStudentIdForBilling({
  supabase,
  accountId,
  requestedStudentId,
  requireOwnedActiveProfileStudent = false,
  errors,
}: ResolveStudentIdForBillingParams): Promise<ResolveStudentIdForBillingResult> {
  // Merge route overrides with defaults so each endpoint can preserve legacy responses.
  const mergedErrors: ResolveErrors = {
    studentNotFound: errors?.studentNotFound ?? DEFAULT_ERRORS.studentNotFound,
    noActiveStudentProfile:
      errors?.noActiveStudentProfile ?? DEFAULT_ERRORS.noActiveStudentProfile,
    invalidActiveStudentProfile:
      errors?.invalidActiveStudentProfile ??
      DEFAULT_ERRORS.invalidActiveStudentProfile,
  };

  if (requestedStudentId) {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", requestedStudentId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (!student) {
      return {
        ok: false,
        error: mergedErrors.studentNotFound.error,
        status: mergedErrors.studentNotFound.status,
      };
    }

    return { ok: true, studentId: student.id };
  }

  const activeProfile = await getActiveProfile();
  if (!activeProfile || activeProfile.type !== "student") {
    return {
      ok: false,
      error: mergedErrors.noActiveStudentProfile.error,
      status: mergedErrors.noActiveStudentProfile.status,
    };
  }

  // In some flows the active profile cookie is trusted as the selected student context.
  if (!requireOwnedActiveProfileStudent) {
    return { ok: true, studentId: activeProfile.id };
  }

  // For stricter flows (e.g. upgrades), re-verify ownership against `students`.
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", activeProfile.id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!student) {
    return {
      ok: false,
      error: mergedErrors.invalidActiveStudentProfile.error,
      status: mergedErrors.invalidActiveStudentProfile.status,
    };
  }

  return { ok: true, studentId: student.id };
}
