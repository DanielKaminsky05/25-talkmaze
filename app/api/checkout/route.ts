import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
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

    const supabase = await createClient();
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if(user == null){
      return NextResponse.json({status: 404, message: "User not found error"})
    }


    // Get the active profile
    const activeProfile = await getActiveProfile();
    console.log("Active Profile: " + JSON.stringify(activeProfile))

    // Active profile must be a student for subscription checkout
    if (!activeProfile || activeProfile.type !== "student") {
      return NextResponse.json(
        { error: "Select a student profile before checkout" },
        { status: 400 },
      );
    }


    // Safety check - active student must belong to current the account
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", activeProfile.id)
      .eq("account_id", user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Active student profile is invalid" },
        { status: 403 },
      );
    }

    // Get the stripe_customer_id (if it exists) from the current user account
    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    // Set the configuration of the Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'custom',
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
     
      // Send additional metadata to stripe, so that the payment record on
      // Stripe can link back to the Talkmaze account & student.
      return_url: `${process.env.NEXT_PUBLIC_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,

      metadata: {
        account_id: user.id,
        price_id: price_id,
        student_id: student.id,
      },
      
    };

    // Reuse existing Stripe customer_id to prevent duplicate customer records
    // If no customer_id exists, Stripe will create a new Customer automatically
    if (account?.stripe_customer_id) {
      sessionConfig.customer = account.stripe_customer_id;
    }

   const session = await stripe.checkout.sessions.create(sessionConfig);

   
    console.log("Session secret: " + session.client_secret)
    return NextResponse.json({status:200,secret: session.client_secret})

  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}



/*
import 'server-only'

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
*/