import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { stripe } from "@/src/services/stripe/client";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";
import { getStripeCustomerIdForAccount } from "@/src/lib/payments/server/getStripeCustomerIdForAccount";
import { findActiveStripeSubscriptionByStudent } from "@/src/lib/payments/server/findActiveStripeSubscriptionByStudent";

const BodySchema = z
  .object({
    studentId: z.string().uuid(),
    priceId: z.string().min(1),
  })
  .strict();

export async function POST(request: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([1]);
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { priceId, studentId: studentIdOverride } = parsed.data;

  // Stage 3: AUTHORIZE (ownership)
  const studentResolution = await resolveStudentIdForBilling({
    supabase,
    accountId: user.id,
    requestedStudentId: studentIdOverride,
    requireOwnedActiveProfileStudent: true,
    errors: {
      studentNotFound: { error: "Forbidden", status: 403 },
      noActiveStudentProfile: {
        error: "Select a student profile before upgrading",
        status: 400,
      },
      invalidActiveStudentProfile: {
        error: "Active student profile is invalid",
        status: 403,
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
    const { data: currentSubscription } = await supabase
      .from("student_subscriptions")
      .select(
        `
        id,
        pending_plan_id,
        pending_stripe_schedule_id,
        plans!student_plans_plan_id_fkey (
          id,
          name,
          cents,
          stripe_price_id
        )
      `,
      )
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    const currentPlan = Array.isArray(currentSubscription.plans)
      ? currentSubscription.plans[0]
      : currentSubscription.plans;

    if (!currentPlan) {
      return NextResponse.json(
        { error: "Current plan not found" },
        { status: 500 },
      );
    }

    const { data: targetPlan, error: targetPlanError } = await supabase
      .from("plans")
      .select("id, name, cents, stripe_price_id")
      .eq("stripe_price_id", priceId)
      .single();

    if (targetPlanError || !targetPlan) {
      return NextResponse.json(
        { error: "Target plan not found" },
        { status: 404 },
      );
    }

    if (targetPlan.stripe_price_id === currentPlan.stripe_price_id) {
      return NextResponse.json(
        { error: "You are already on this plan. It will auto-renew." },
        { status: 409 },
      );
    }

    if (currentSubscription.pending_plan_id === targetPlan.id) {
      return NextResponse.json(
        { error: "This plan change is already scheduled" },
        { status: 409 },
      );
    }

    const customerId = await getStripeCustomerIdForAccount({
      supabase,
      accountId: user.id,
    });

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    const customer = (await stripe.customers.retrieve(
      customerId,
    )) as Stripe.Customer;
    const prefill = {
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };

    const stripeSubscription = await findActiveStripeSubscriptionByStudent({
      customerId,
      studentId,
    });

    if (!stripeSubscription) {
      return NextResponse.json(
        { error: "No Stripe subscription found" },
        { status: 404 },
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: {
        account_id: user.id,
        student_id: studentId,
        target_price_id: priceId,
        stripe_subscription_id: stripeSubscription.id,
        replace_schedule_id:
          currentSubscription.pending_stripe_schedule_id ?? "",
      },
    });

    if (!setupIntent.client_secret) {
      return NextResponse.json(
        { error: "Unable to initialize plan change confirmation" },
        { status: 500 },
      );
    }

    // In Stripe API 2024+, current_period_end lives on the subscription item,
    // not directly on the subscription object.
    type SubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
      current_period_end: number;
    };

    const subscriptionItem = stripeSubscription.items
      .data[0] as SubscriptionItemWithPeriod;
    const effectiveDate = new Date(
      subscriptionItem.current_period_end * 1000,
    ).toISOString();

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      prefill,
      effectiveDate,
    });
  } catch (err: unknown) {
    console.error("schedule error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
