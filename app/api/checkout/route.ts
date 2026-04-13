import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** 
 POST /api/checkout
 Initiates a Stripe subscription for the active student profile.
 Returns a clientSecret for the Stripe embedded payment form 
 and the subscriptionId of the Stripe subscription record.
*/
export async function POST(request: Request) {
  try {
    // Retrieve the Stripe (product) price_id from the request body
    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Authenticate the current user via Supabase session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only student profiles can check out.
    // Reject parents/admins or missing profiles
    const activeProfile = await getActiveProfile();
    if (!activeProfile || activeProfile.type !== "student") {
      return NextResponse.json(
        { error: "Select a student profile before checkout" },
        { status: 400 },
      );
    }

    // Verify the active student profile belongs to the authenticated account
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

    // Look up the account's existing Stripe customer ID,
    // or create a new Stripe customer
    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId =
      account?.stripe_customer_id ||
      (await stripe.customers.create({ email: user.email ?? undefined })).id;

    // Persist the newly created Stripe customer ID so future checkouts reuse it
    if (!account?.stripe_customer_id) {
      await supabase
        .from("account")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // When a user navigate to the /checkouts page, the /api/checkout is
    // called, it creates an "incomplete subscription" Stripe client secret to 
    // be mounted, awaiting to be submitted when to user fills out and submits 
    // the checkout form.
    // A problem may occur if the user navigates back via the browser back 
    // button, router.back(). In Next.js App Router, the page can remain in the
    // Router Cache. And when the user returns to the checkout page with and
    // submits the checkout form, it can cause cached background client  
    // components to remount, submitting all danging "incomplete subscriptions".
    
    // This is why the below is added, to clean all previous "incomplete subs."
    const existingIncomplete = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
    });
    await Promise.all(
      existingIncomplete.data.map((sub) => stripe.subscriptions.cancel(sub.id)),
    );

    // Create the subscription in an incomplete state so we can collect payment
    // details before confirming. Metadata links the subscription back to our
    // internal account and student records (used by the Stripe webhook handler)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: {
        account_id: user.id,
        student_id: student.id,
        price_id: priceId,
      },
      // Expand nested objects so we can extract the client secret in one call
      expand: [
        "latest_invoice.payment_intent",
        "latest_invoice.confirmation_secret",
      ],
    });

    // Stripe may return the client secret via payment_intent (older API) or
    // confirmation_secret (newer API). Handle both to stay forward-compatible
    type ExpandedInvoice = Stripe.Invoice & {
      payment_intent: Stripe.PaymentIntent | null;
      confirmation_secret: { client_secret: string | null } | null;
    };

    const invoice = subscription.latest_invoice as ExpandedInvoice | null;
    const clientSecret =
      invoice?.payment_intent?.client_secret ??
      invoice?.confirmation_secret?.client_secret ??
      null;

    if (!clientSecret) {
      return NextResponse.json(
        { error: "Unable to initialize subscription payment" },
        { status: 500 },
      );
    }

    // Return the client secret(for frontend to mount the Stripe PaymentElement)
    // and the subscription ID (used to poll/confirm subscription status)
    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });
  } catch (err: unknown) {
    console.error("Stripe Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
