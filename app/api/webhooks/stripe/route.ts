import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

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
    if (
      event.type === "checkout.session.completed" ||
      event.type === `checkout.session.async_payment_succeeded`
    ) {
      console.log("Payment successful:", event);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.log(`Stripe Webhook Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
