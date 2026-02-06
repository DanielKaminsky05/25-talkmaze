import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your Secret Key from .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
  try {
    const { amount, email } = await request.json();

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
  }
}