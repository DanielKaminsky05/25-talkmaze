import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

// Initialize Stripe with your Secret Key from .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
  try {
    const req = await request.json();

    
    let price_id = req.price_id;
    let amount = req.amount;
    let name = req.name;

    if (!price_id) {
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

    if(user == null){
      return NextResponse.json({status: 404, message: "User not found error"})
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: 'usd',
      automatic_payment_methods: {enabled: true},
      metadata:{
        account_id: user.id,
        price_id
      }
    });


    if(!paymentIntent){
      return NextResponse.json({status:500, message: "Error creating payment intent"})

    }
    return NextResponse.json({status:200,secret: paymentIntent.client_secret})

  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
