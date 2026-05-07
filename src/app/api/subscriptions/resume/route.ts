import { NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";
import { stripe } from "@/src/services/stripe/client";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";
import { getStripeCustomerIdForAccount } from "@/src/lib/payments/server/getStripeCustomerIdForAccount";
import { findActiveStripeSubscriptionByStudent } from "@/src/lib/payments/server/findActiveStripeSubscriptionByStudent";

/**
 * POST /api/subscriptions/resume
 * Resumes auto-renewal for a subscription that was scheduled to cancel at
 * period end.
 */
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

    const body = await req.json().catch(() => ({}));
    const bodyStudentId: string | undefined = body?.studentId;

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
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .not("cancelled_at", "is", null)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "No cancellation scheduled for this subscription" },
        { status: 404 },
      );
    }

    const stripeCustomerId = await getStripeCustomerIdForAccount({
      supabase,
      accountId: user.id,
    });
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    const stripeSubscription = await findActiveStripeSubscriptionByStudent({
      customerId: stripeCustomerId,
      studentId,
    });

    if (!stripeSubscription) {
      return NextResponse.json(
        { error: "No Stripe subscription found" },
        { status: 404 },
      );
    }

    await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: false,
    });

    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({ cancelled_at: null })
      .eq("id", subscription.id);

    if (updateError) {
      console.error(
        "resume: error updating student_subscriptions:",
        updateError,
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Resume subscription error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
