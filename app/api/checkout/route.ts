import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { amount, priceId } = await request.json();

    if (!amount || !priceId) {
      return NextResponse.json(
        { error: "Amount and Price ID are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the active profile
    const activeProfile = await getActiveProfile();

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

    const customerId =
      account?.stripe_customer_id ||
      (await stripe.customers.create({ email: user.email })).id;

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount),
      currency: "cad",
      customer: customerId,
      setup_future_usage: "off_session",
      // Pass metadata here so the webhook can use it
      metadata: {
        account_id: user.id,
        student_id: student.id,
        price_id: priceId,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
