import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/services/supabase/server";
import { stripe } from "@/services/stripe/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

type UpgradeRequestBody = {
  priceId?: string;
  studentId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as UpgradeRequestBody;
    const priceId = body.priceId;
    const studentIdOverride = body.studentId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let studentId: string;

    if (studentIdOverride) {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentIdOverride)
        .eq("account_id", user.id)
        .single();

      if (studentError || !student) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      studentId = student.id;
    } else {
      const activeProfile = await getActiveProfile();
      if (!activeProfile || activeProfile.type !== "student") {
        return NextResponse.json(
          { error: "Select a student profile before upgrading" },
          { status: 400 },
        );
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", activeProfile.id)
        .eq("account_id", user.id)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: "Active student profile is invalid" },
          { status: 403 },
        );
      }
      studentId = student.id;
    }

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

    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId =
      account?.stripe_customer_id ||
      (await stripe.customers.create({ email: user.email ?? undefined })).id;

    if (!account?.stripe_customer_id) {
      await supabase
        .from("account")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const customer = (await stripe.customers.retrieve(
      customerId,
    )) as Stripe.Customer;
    const prefill = {
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };

    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    const stripeSubscription = stripeSubscriptions.data.find(
      (sub) => sub.metadata?.student_id === studentId,
    );

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
    console.error("Upgrade initialization error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
