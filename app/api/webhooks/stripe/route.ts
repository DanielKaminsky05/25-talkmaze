import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    /**
     * For testing in local dev environment use the webhook key given by STRIPE
     * CLI during stripe listen --forward-to localhost:3000/api/webhooks/stripe
     */
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
    }

    if (signature === null) {
      throw new Error("Stripe signature is not defined");
    }

    const event: Stripe.Event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    // All types of stripe events: https://docs.stripe.com/api/events
    // Check the event type, and run the logic you want for the given event

    /** Event - Successful payment */
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      // Get the customer ID and account ID from the session
      const customerId = session.customer as string;
      const accountId = session.metadata?.account_id;

      if (customerId && accountId) {
        const supabase = await createClient();

        // Update the parent's stripe_customer_id in the database
        const { error } = await supabase
          .from("parents")
          .update({ stripe_customer_id: customerId })
          .eq("account_id", accountId);

        if (error) {
          console.error("Error updating parent stripe_customer_id:", error);
        } else {
          console.log(`Updated stripe_customer_id for account ${accountId}`);
        }

        // Get the student associated with this parent account
        const { data: parentData, error: parentError } = await supabase
          .from("parents")
          .select("id")
          .eq("account_id", accountId)
          .single();

        if (parentError || !parentData) {
          console.error("Error fetching parent:", parentError);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Get the student linked to this parent. For now i'm just getting the
        // first student record linked to the parent.
        // TODO: fetch the student that the parent is paying for in the checkout
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("account_id", accountId)
          .limit(1)
          .maybeSingle();

        if (studentError || !student) {
          console.error("Error fetching student:", studentError);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Get the plan ID from the stripe price ID
        const priceId = session.metadata?.price_id;

        if (!priceId) {
          console.error("Error: price_id not found in session metadata");
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const { data: plan, error: planError } = await supabase
          .from("plans")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        if (planError || !plan) {
          console.error("Error fetching plan:", planError);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Create the student_subscription record
        // For now the period end is just hard-coded to 1 month later
        // TODO: use the actual renewal date for currentPeriodEnd
        const now = new Date().toISOString();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // Assuming 1-month subscription for now,

        const { error: subscriptionError } = await supabase
          .from("student_subscriptions")
          .insert({
            student_id: student.id,
            plan_id: plan.id,
            payer_parent_id: parentData.id,
            status: "active",
            current_period_start: now,
            current_period_end: currentPeriodEnd.toISOString(),
          });

        if (subscriptionError) {
          console.error("Error creating student_subscription:", subscriptionError);
        } else {
          console.log(`Created student_subscription for student ${student.id}`);
        }
      } else {
        console.warn("Missing customer ID or account ID in webhook session");
      }

      console.log("Payment successful:", event);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.log(`Stripe Webhook Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
