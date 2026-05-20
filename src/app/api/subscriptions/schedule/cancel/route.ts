import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/src/services/stripe/client";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";

const BodySchema = z.object({ studentId: z.string().uuid() }).strict();

export async function POST(req: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([1]);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Stage 3: AUTHORIZE (ownership)
  const studentResolution = await resolveStudentIdForBilling({
    supabase,
    accountId: user.id,
    requestedStudentId: parsed.data.studentId,
    errors: {
      studentNotFound: { error: "Forbidden", status: 403 },
      noActiveStudentProfile: {
        error: "No active student profile",
        status: 400,
      },
    },
  });

  if (!studentResolution.ok) {
    return NextResponse.json(
      { error: studentResolution.error },
      { status: studentResolution.status },
    );
  }
  const studentId = studentResolution.studentId;

  // Stage 4: EXECUTE
  try {
    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select("id, pending_stripe_schedule_id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.pending_stripe_schedule_id) {
      return NextResponse.json(
        { error: "No pending plan change found" },
        { status: 404 },
      );
    }

    try {
      await stripe.subscriptionSchedules.release(
        subscription.pending_stripe_schedule_id,
      );
    } catch (releaseError) {
      console.error("schedule-cancel: schedule release failed", releaseError);
    }

    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({
        pending_plan_id: null,
        pending_effective_date: null,
        pending_stripe_schedule_id: null,
        pending_created_at: null,
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("schedule-cancel: update error", updateError);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("schedule-cancel error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
