import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/services/supabase/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertOwnsStudent } from "@/src/lib/auth/server/ownership";
import type { Database } from "@/src/services/supabase/types/database";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type DbClient = SupabaseClient<Database>;

/**
 * POST /api/checkout
 *
 * Two flows controlled by `studentId`:
 *   - `studentId === "new"` → public sub-flow (signup + first payment).
 *     Anonymous callers are allowed by design (docs/api-auth.md:194-218).
 *   - `studentId !== "new"` → authed flow: requireRole([1]) + assertOwnsStudent.
 *
 * NOTE on stage ordering: validation runs BEFORE auth here because the auth
 * branch depends on `studentId`. This is the documented checkout exception
 * (docs/api-auth.md §"The /api/checkout exception"). The public branch is
 * intentional, not accidental.
 */

const BodySchema = z
  .object({
    priceId: z.string().min(1),
    studentId: z.union([z.literal("new"), z.string().uuid()]),
    // Signup-only fields. Optional — only meaningful when studentId === "new".
    pFName: z.string().optional(),
    pLName: z.string().optional(),
    sFName: z.string().optional(),
    sLName: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
  })
  .strict();

type CheckoutBody = z.infer<typeof BodySchema>;

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.studentId !== "new") {
    // Authed flow: role gate + ownership BEFORE any Stripe work.
    const auth = await requireRole([1]);
    if (auth instanceof NextResponse) return auth;

    const ownership = await assertOwnsStudent(auth, data.studentId);
    if (ownership instanceof NextResponse) return ownership;

    return handleAuthedCheckout(
      auth.supabase,
      auth.user.id,
      auth.user.email ?? null,
      data,
      data.studentId,
    );
  }

  // Public signup flow.
  const supabase = await createClient();
  return handleNewSignupCheckout(supabase, data);
}

async function handleAuthedCheckout(
  supabase: DbClient,
  userId: string,
  userEmail: string | null,
  data: CheckoutBody,
  studentId: string,
) {
  try {
    // Block duplicate active subscriptions for this student.
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

    // Reuse or create the Stripe customer.
    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    const customerId =
      account?.stripe_customer_id ||
      (await stripe.customers.create({ email: userEmail ?? undefined })).id;

    if (!account?.stripe_customer_id) {
      await supabase
        .from("account")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    return await buildSubscriptionResponse(
      customerId,
      userId,
      studentId,
      data.priceId,
    );
  } catch (err: unknown) {
    console.error("checkout (authed) error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleNewSignupCheckout(
  _supabase: DbClient,
  data: CheckoutBody,
) {
  try {
    const customer = await stripe.customers.create({
      email: data.email ?? undefined,
    });
    return await buildSubscriptionResponse(
      customer.id,
      "new",
      "new",
      data.priceId,
    );
  } catch (err: unknown) {
    console.error("checkout (new signup) error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function buildSubscriptionResponse(
  customerId: string,
  userId: string,
  studentId: string,
  priceId: string,
) {
  // Pull up-to-date customer for prefill.
  const customer = (await stripe.customers.retrieve(
    customerId,
  )) as Stripe.Customer;
  const prefill = {
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
  };

  // Drain any pre-existing "incomplete" subscriptions for this customer.
  // Next.js Router Cache can replay the checkout page mount on browser-back,
  // creating orphaned incomplete subs. Clean them before creating a new one.
  const existingIncomplete = await stripe.subscriptions.list({
    customer: customerId,
    status: "incomplete",
  });
  await Promise.all(
    existingIncomplete.data.map((sub) => stripe.subscriptions.cancel(sub.id)),
  );

  // SECURITY: metadata MUST NOT contain `password` or any PII beyond the IDs
  // the webhook needs. Stripe dashboard makes metadata visible to anyone with
  // Stripe access — historically this route stored the plaintext password
  // there (docs/repo-quality-audit.md). Don't reintroduce.
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    metadata: {
      account_id: userId,
      student_id: studentId,
      price_id: priceId,
    },
    expand: [
      "latest_invoice.payment_intent",
      "latest_invoice.confirmation_secret",
    ],
  });

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

  return NextResponse.json({
    clientSecret,
    subscriptionId: subscription.id,
    prefill,
  });
}
