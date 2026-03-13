<<<<<<< HEAD
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
=======
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";
>>>>>>> origin/stripe-webhook-integration

// Initialize Stripe with your Secret Key from .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
  try {
    const { amount, email } = await request.json();

<<<<<<< HEAD
    // Create a PaymentIntent with the specific amount
    // This tells Stripe: "Someone is about to pay this much"
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount), // Stripe expects cents (e.g., 2000 = $20.00)
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
    });

    // Send the "Client Secret" back to the frontend
    // This is the key your frontend needs to show the payment form
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
=======
    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Get the logged-in user from the current session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the parent has an existing Stripe customer ID from previous purchases
    const { data: parent } = await supabase
      .from("parents")
      .select("stripe_customer_id")
      .eq("account_id", user.id)
      .single();

    // Configure the Stripe checkout session parameters
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.headers.get("origin")}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/payments/checkout`,
      metadata: {
        // Store account_id so our webhook can identify which parent made the payment
        // This is necessary because webhooks don't have access to user sessions
        account_id: user.id,
        price_id: priceId,
      },
    };

    // Reuse the existing Stripe Customer to prevent duplicate customer records
    // If no customer_id exists, Stripe will create a new Customer automatically
    if (parent?.stripe_customer_id) {
      sessionConfig.customer = parent.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
>>>>>>> origin/stripe-webhook-integration
  }
}
