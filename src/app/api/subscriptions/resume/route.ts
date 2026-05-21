import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/src/services/stripe/client";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";
import { getStripeCustomerIdForAccount } from "@/src/lib/payments/server/getStripeCustomerIdForAccount";
import { findActiveStripeSubscriptionByStudent } from "@/src/lib/payments/server/findActiveStripeSubscriptionByStudent";

const BodySchema = z.object({ studentId: z.string().uuid() }).strict();

/**
 * POST /api/subscriptions/resume
 * Resumes auto-renewal for a subscription that was scheduled to cancel at
 * period end.
 */
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
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .not("cancelled_at", "is", null)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

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
    console.error("resume error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
