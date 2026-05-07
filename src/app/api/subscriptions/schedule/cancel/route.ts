import { NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";
import { stripe } from "@/src/services/stripe/client";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";

type CancelScheduleBody = {
  studentId?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as CancelScheduleBody;
    const bodyStudentId = body?.studentId;

    const studentResolution = await resolveStudentIdForBilling({
      supabase,
      accountId: user.id,
      requestedStudentId: bodyStudentId,
      errors: {
        studentNotFound: { error: "Student not found", status: 404 },
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
    console.error("Cancel plan change error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
