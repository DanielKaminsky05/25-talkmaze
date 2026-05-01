import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
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
    // Retrieve the Stripe (product) price_id from the request body.
    // studentId is optional — provided when a parent is checking out on behalf of a child.
    const { priceId, studentId: studentIdOverride, pFName, pLName, sFName, sLName, email, password} = await request.json();
    
    console.log("Inside checkout api: " + pFName)
    console.log(pLName);
    console.log(sFName);
    console.log(sLName);
    console.log(email);
    console.log(password);
    
    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Authenticate the current user via Supabase session

    //if its the first payment user account not created yet

    const supabase = await createClient();
    let customerId: string = "";


    //if(studentIdOverride != 'new') aka existing user
    let user_id: string = 'new';
    let user_email: string | undefined = email;
    if (studentIdOverride != 'new') {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      user_id = user.id;
      user_email = user.email;
    }

    // Resolve which student this checkout is for.
    // If studentId was passed (parent flow), verify the account owns that student.
    // Otherwise fall back to the active student profile cookie.
    let studentId: string = 'new';

    if (studentIdOverride != "new") {
      if (studentIdOverride) {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("id", studentIdOverride)
          .eq("account_id", user_id)
          .single();

        if (studentError || !student) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        studentId = student.id;
      } else {
        const activeProfile = await getActiveProfile();
        if (!activeProfile || activeProfile.type !== "student") {
          return NextResponse.json(
            { error: "Select a student profile before checkout" },
            { status: 400 },
          );
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("id", activeProfile.id)
          .eq("account_id", user_id)
          .single();

        if (studentError || !student) {
          return NextResponse.json(
            { error: "Active student profile is invalid" },
            { status: 403 },
          );
        }
        studentId = student.id;
      }


      // Block checkout if the student already has an active subscription
      const { data: existingSub } = await supabase
        .from("student_subscriptions")
        .select("id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .maybeSingle();

      if (existingSub) {
        return NextResponse.json(
          { error: "Student already has an active subscription" },
          { status: 409 },
        );
      }

      // Look up the account's existing Stripe customer ID,
      // or create a new Stripe customer


      const { data: account } = await supabase
        .from("account")
        .select("stripe_customer_id")
        .eq("id", user_id)
        .single();



      customerId =
        account?.stripe_customer_id ||
        (await stripe.customers.create({ email: user_email ?? undefined })).id;

      // Persist the newly created Stripe customer ID so future checkouts reuse it
      if (!account?.stripe_customer_id) {
        await supabase
          .from("account")
          .update({ stripe_customer_id: customerId })
          .eq("id", user_id);
      }
    } else {
      customerId = (await stripe.customers.create({ email: user_email ?? undefined })).id
    }



    // Fetch saved contact info to pre-fill the checkout form for returning customers
    const customer = (await stripe.customers.retrieve(
      customerId,
    )) as Stripe.Customer;
    const prefill = {
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };

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


    
    const id = studentIdOverride === 'new' ? 'new' : user_id;
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: {
        account_id: user_id,
        student_id: studentId,
        price_id: priceId,
        parent_first_name: pFName ?? "",
        parent_last_name: pLName ?? "",
        student_first_name: sFName ?? "",
        student_last_name: sLName ?? "",
        email: email ?? "",
        password: password ?? ""
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
    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      prefill,
    });
  } catch (err: unknown) {
    console.error("Stripe Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
