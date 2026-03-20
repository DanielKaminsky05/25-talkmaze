import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { TeachworksClient } from "@/lib/teachworks/client";

export async function POST(request: Request) {
  try {

    
    const body = await request.text();
    const headersList = Object.fromEntries(request.headers.entries());
    const signature = headersList['stripe-signature']
    
    /**
     * For testing in local dev environment use the webhook key given by STRIPE
     * CLI during stripe listen --forward-to localhost:3000/api/webhooks/stripe
     */
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.log("No webhook secret")
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

      const customerId = session.customer as string;
      const accountId = session.metadata?.account_id;
      const studentIdFromMetadata = session.metadata?.student_id;


       try{
            //attempting to make lessonspace
          console.log("Attemping to make lessonspace")
          const response = await fetch('http://localhost:3000/api/webhooks/stripe/learningSpace', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application.json'
                },
                body: JSON.stringify({
                    student_id: studentIdFromMetadata
            })})
        }catch(err){
            console.log("Inside lesson error")
            console.log("Error: " + err);
        }
      
      if (customerId && accountId) {
        const supabase = await createClient();

        // Store Stripe customer id on account
        const { error: accountUpdateError } = await supabase
          .from("account")
          .update({ stripe_customer_id: customerId })
          .eq("id", accountId);

        if (accountUpdateError) {
          console.error(
            "Error updating account stripe_customer_id:",
            accountUpdateError,
          );
        }

        if (!studentIdFromMetadata) {
          console.error("Error: student_id not found in session metadata");
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("id", studentIdFromMetadata)
          .eq("account_id", accountId)
          .single();

        if (studentError || !student) {
          console.error("Error fetching student from metadata:", studentError);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const priceId = session.metadata?.price_id;
        if (!priceId) {
          console.error("Error: price_id not found in session metadata");
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const { data: plan, error: planError } = await supabase
          .from("plans")
          .select("id, classes")
          .eq("stripe_price_id", priceId)
          .single();

        if (planError || !plan) {
          console.error("Error fetching plan:", planError);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const stripeSubscriptionId = session.subscription as string;
        let currentPeriodStart: string;
        let currentPeriodEnd: string;

        if (stripeSubscriptionId) {
          const stripeSubscription =
            await stripe.subscriptions.retrieve(stripeSubscriptionId);
          // Subscription renewal date is stored in first element of items
          const subscriptionItem = stripeSubscription.items.data[0];
          currentPeriodStart = new Date(
            subscriptionItem.current_period_start * 1000,
          ).toISOString();
          currentPeriodEnd = new Date(
            subscriptionItem.current_period_end * 1000,
          ).toISOString();
        } else {
          currentPeriodStart = new Date().toISOString();
          const fallbackEnd = new Date();
          fallbackEnd.setMonth(fallbackEnd.getMonth() + 1);
          currentPeriodEnd = fallbackEnd.toISOString();
        }

        const { error: subscriptionError } = await supabase
          .from("student_subscriptions")
          .insert({
            account_id: accountId,
            student_id: student.id,
            plan_id: plan.id,
            status: "active",
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            classes_left: plan.classes,
          });

        if (subscriptionError) {
          console.error(
            "Error creating student_subscription:",
            subscriptionError,
          );
        }
      }
    }

    /** Create Teachworks payment record whenever Stripe confirms invoice payment */
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!stripeCustomerId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabase = await createClient();

      const { data: account, error: accountError } = await supabase
        .from("account")
        .select("id")
        .eq("stripe_customer_id", stripeCustomerId)
        .single();

      if (accountError || !account) {
        console.error(
          "Error fetching account from stripe customer_id:",
          accountError,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const { data: parent, error: parentError } = await supabase
        .from("parents")
        .select("tw_id")
        .eq("account_id", account.id)
        .single();

      if (parentError || !parent?.tw_id) {
        console.error("Error fetching parent tw_id:", parentError);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (!process.env.TEACHWORKS_API_KEY) {
        console.error("TEACHWORKS_API_KEY is not defined");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const teachworksClient = new TeachworksClient(
        process.env.TEACHWORKS_API_KEY,
      );

      const paidAt = invoice.status_transitions?.paid_at;
      const paymentDate = paidAt
        ? new Date(paidAt * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      try {
        await teachworksClient.createPayment({
          customer_id: parent.tw_id,
          date: paymentDate,
          amount: (invoice.amount_paid / 100).toFixed(2),
          description: "",
          payment_method: "Credit Card",
        });

      } catch (teachworksError) {
        console.error("Error creating Teachworks payment:", teachworksError);
      }

      
      
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.log(`Stripe Webhook Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
