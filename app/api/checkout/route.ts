import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount, email, name } = await req.json();

    // 1. Create a Stripe Customer (this stores their info in Stripe)
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
    });

    // 2. Create a PaymentIntent tied to that customer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount),   // must be in cents
      currency: 'cad',            // you're showing CA prices
      customer: customer.id,      // links payment to stored customer
      setup_future_usage: 'off_session', // optional: saves card for future charges
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}