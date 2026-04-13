import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

/**
 * POST /api/subscriptions/cancel
 * Cancels the active student subscription both in Stripe and in Supabase.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeProfile = await getActiveProfile();
    if (!activeProfile || activeProfile.type !== "student") {
      return NextResponse.json(
        { error: "No active student profile" },
        { status: 400 },
      );
    }

    // Find the active subscription record in Supabase
    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select("id")
      .eq("student_id", activeProfile.id)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Get the Stripe customer ID from the account table
    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!account?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    // Find the matching active Stripe subscription via student_id in metadata
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: account.stripe_customer_id,
      status: "active",
    });

    const stripeSubscription = stripeSubscriptions.data.find(
      (sub) => sub.metadata?.student_id === activeProfile.id,
    );

    if (!stripeSubscription) {
      return NextResponse.json(
        { error: "No Stripe subscription found" },
        { status: 404 },
      );
    }

    // Cancel the subscription immediately in Stripe
    await stripe.subscriptions.cancel(stripeSubscription.id);

    // Update the Supabase record to reflect the cancellation
    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error(
        "cancel: error updating student_subscriptions:",
        updateError,
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Cancel subscription error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
