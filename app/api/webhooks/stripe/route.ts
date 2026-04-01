import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/app/api/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { TeachworksClient } from "@/lib/teachworks/client";

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events.
 *
 * For testing in local env set the STRIPE_WEBHOOK_SECRET key given by STRIPE CLI
 * Then run the command:
 * stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  try {
    // Read the raw body as text. Required by Stripe's signature verification,
    // which breaks if the body is parsed (e.g. via request.json()) first
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
    }

    if (signature === null) {
      throw new Error("Stripe signature is not defined");
    }

    // Verify the event came from Stripe and wasn't tampered with.
    // Throws if the signature is invalid, which returns a 400 to Stripe.
    const event: Stripe.Event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    /* 
     STRIPE EVENT: invoice.paid
     The 'invoice.paid' event fires for both the initial subscription payment 
     and monthly renewals 
    */
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      // customer can be an expanded object or just an ID string
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!stripeCustomerId) {
        console.error("invoice.paid: no customer ID on invoice");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Use the Supabase service-role client. Necessary for webhooks.
      const supabase = createServiceRoleClient();

      // --- Create/update supabase student_subscriptions table record ---

      const invoiceAny = invoice as any;
      const stripeSubscriptionId: string | undefined =
        invoiceAny.parent?.subscription_details?.subscription ??
        (typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id) ??
        undefined;

      // log the subscription id
      console.log("invoice.paid: stripeSubscriptionId =", stripeSubscriptionId);

      let paymentDescription = "";

      if (stripeSubscriptionId) {
        // Fetch the full subscription to read the metadata set during checkout
        // (account_id, student_id, price_id — see /api/checkout)
        const subscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const {
          account_id: accountId,
          student_id: studentId,
          price_id: priceId,
        } = subscription.metadata ?? {};

        if (!accountId || !studentId || !priceId) {
          console.error(
            "invoice.paid: missing metadata on subscription",
            stripeSubscriptionId,
            subscription.metadata,
          );
        } else {
          // Look up our internal plan record using the Stripe price ID
          const { data: plan, error: planError } = await supabase
            .from("plans")
            .select("id, classes, name")
            .eq("stripe_price_id", priceId)
            .single();

          if (planError || !plan) {
            console.error(
              "invoice.paid: error fetching plan for price_id:",
              priceId,
              planError,
            );
          } else {
            // Convert Stripe's Unix timestamps to ISO strings for Supabase
            const subscriptionItem = subscription.items.data[0];
            const currentPeriodStart = new Date(
              subscriptionItem.current_period_start * 1000,
            ).toISOString();
            const currentPeriodEnd = new Date(
              subscriptionItem.current_period_end * 1000,
            ).toISOString();

            // Check if a subscription record already exists for this account/student/plan
            // (most-recent-first so renewals update the right row)
            const { data: existing } = await supabase
              .from("student_subscriptions")
              .select("id")
              .eq("account_id", accountId)
              .eq("student_id", studentId)
              .eq("plan_id", plan.id)
              .order("current_period_end", { ascending: false })
              .limit(1);

            const existingId = existing?.[0]?.id;

            if (existingId) {
              // Renewal: update the existing record with the new billing period
              // and reset classes_left to the plan's full class count
              const { error } = await supabase
                .from("student_subscriptions")
                .update({
                  status: "active",
                  current_period_start: currentPeriodStart,
                  current_period_end: currentPeriodEnd,
                  classes_left: plan.classes,
                })
                .eq("id", existingId);
              if (error)
                console.error(
                  "invoice.paid: error updating student_subscription:",
                  error,
                );
            } else {
              // Initial payment: create a new subscription record
              const { error } = await supabase
                .from("student_subscriptions")
                .insert({
                  account_id: accountId,
                  student_id: studentId,
                  plan_id: plan.id,
                  status: "active",
                  current_period_start: currentPeriodStart,
                  current_period_end: currentPeriodEnd,
                  classes_left: plan.classes,
                });
              if (error)
                console.error(
                  "invoice.paid: error creating student_subscription:",
                  error,
                );
            }

            // Build description for the Teachworks payment record
            const { data: student } = await supabase
              .from("students")
              .select("name")
              .eq("id", studentId)
              .single();
            paymentDescription = `Payment for ${student?.name ?? "student"} - ${plan.name}`;

            // Trigger LessonSpace creation for this student.
            // The learningSpace route is idempotent — it skips if the student
            // already has a space, so this is safe to call on renewals too.
            try {
              const lsRes = await fetch(
                `http://localhost:3000/api/webhooks/stripe/learningSpace`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ student_id: studentId }),
                },
              );
              const lsBody = await lsRes.json();
              console.log("invoice.paid: LessonSpace response:", lsRes.status, lsBody);
            } catch (lessonSpaceError) {
              console.error(
                "invoice.paid: error creating LessonSpace:",
                lessonSpaceError,
              );
            }
          }
        }
      }

      // --- Create Teachworks payment record ---

      // Look up our internal account via the Stripe customer ID
      const { data: account, error: accountError } = await supabase
        .from("account")
        .select("id")
        .eq("stripe_customer_id", stripeCustomerId)
        .single();

      if (accountError || !account) {
        console.error(
          "invoice.paid: error fetching account from stripe_customer_id:",
          accountError,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Teachworks uses its own customer ID (tw_id) stored on the parent record
      const { data: parent, error: parentError } = await supabase
        .from("parents")
        .select("tw_id")
        .eq("account_id", account.id)
        .single();

      if (parentError || !parent?.tw_id) {
        console.error(
          "invoice.paid: error fetching parent tw_id:",
          parentError,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (!process.env.TEACHWORKS_API_KEY) {
        console.error("TEACHWORKS_API_KEY is not defined");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const teachworksClient = new TeachworksClient(
        process.env.TEACHWORKS_API_KEY,
      );

      // Use Stripe's recorded paid_at timestamp if available; fall back to now
      const paidAt = invoice.status_transitions?.paid_at;
      const paymentDate = paidAt
        ? new Date(paidAt * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Teachworks errors are caught separately so they don't prevent a 200
      // response to Stripe (which would cause Stripe to retry the webhook)
      try {
        await teachworksClient.createPayment({
          customer_id: parent.tw_id,
          date: paymentDate,
          amount: (invoice.amount_paid / 100).toFixed(2), // cents → dollars
          description: paymentDescription,
          payment_method: "Credit Card",
        });
      } catch (teachworksError) {
        console.error(
          "invoice.paid: error creating Teachworks payment:",
          teachworksError,
        );
      }
    }

    // Always return 200 so Stripe knows the webhook was received.
    // Errors inside event handling are logged but don't change this response.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    // Return 400 for signature verification failures or missing env vars
    // this tells Stripe the event was rejected and may trigger a retry
    const errorMessage =
      err instanceof Error ? err.message : "Unknown webhook error";
    console.log(`Stripe Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
