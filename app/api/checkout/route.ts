import { NextResponse } from 'next/server';
<<<<<<< HEAD
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/payments/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

=======
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
>>>>>>> origin/PaymentPage
