import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { stripe } from "@/src/services/stripe/client";
import Stripe from "stripe";

/**
 * GET /api/admin/payment-plans
 *
 * Returns all payment plans ordered by price ascending, each enriched with
 * live data fetched from Stripe (product name, amount, billing interval).
 *
 * @returns 200 Array of plan rows merged with Stripe price/product fields.
 */
export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data: plans, error } = await supabase
      .from("plans")
      .select("*")
      .order("cents", { ascending: true });

    if (error) throw error;

    // Enrich each plan with live Stripe data in parallel. Individual failures
    // are caught and silently skipped so one bad price ID doesn't
    // break the list.
    const enriched = await Promise.all(
      (plans ?? []).map(async (plan) => {
        try {
          const price = await stripe.prices.retrieve(plan.stripe_price_id, {
            expand: ["product"],
          });
          const product = price.product as Stripe.Product;
          return {
            ...plan,
            stripe_product_name: product.name,
            stripe_amount: price.unit_amount,
            stripe_currency: price.currency,
            stripe_interval: price.recurring?.interval ?? null,
            stripe_interval_count: price.recurring?.interval_count ?? null,
          };
        } catch {
          // Return the raw DB row if Stripe lookup fails for this plan.
          return { ...plan };
        }
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching payment plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/payment-plans
 *
 * Creates a new payment plan linked to an existing Stripe price. The price must
 * already exist in Stripe — this follows a Stripe-first workflow where admins
 * create products/prices in the Stripe dashboard, then import them here.
 *
 * Price amount and currency are pulled directly from Stripe so they stay
 * consistent with what Stripe will actually charge. Only display metadata
 * (name, classes, renewal text, etc.) is admin-supplied.
 *
 * @body stripe_price_id - Existing Stripe Price ID (e.g. "price_xxx")
 * @body classes         - Number of coaching sessions allocated per billing period
 * @body name            - Display name for the plan
 * @body renewal         - Human-readable billing interval (e.g. "per 3 months")
 * @body description     - Optional plan description shown to students
 * @body type            - Optional label (e.g. "3 Classes")
 *
 * @returns 201 Created plan row merged with Stripe enrichment fields.
 * @returns 400 If required fields are missing or the Stripe price ID doesn't exist.
 * @returns 409 If a plan already uses the given Stripe price ID.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const body = await req.json();
    const { stripe_price_id, classes, name, description, renewal, type } = body;

    if (!stripe_price_id || !classes || !name || !renewal) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate the price exists in Stripe before writing anything to the DB.
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(stripe_price_id, {
        expand: ["product"],
      });
    } catch {
      return NextResponse.json(
        { error: "Stripe price ID not found" },
        { status: 400 },
      );
    }

    // Prevent duplicate plans pointing at the same Stripe price - one price
    // should correspond to exactly one plan in our DB.
    const { data: existing } = await supabase
      .from("plans")
      .select("id")
      .eq("stripe_price_id", stripe_price_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A plan with this Stripe price ID already exists" },
        { status: 409 },
      );
    }

    // Derive cents and currency from Stripe rather than trusting the request
    // since these must match what Stripe will actually charge.
    const { data: plan, error } = await supabase
      .from("plans")
      .insert({
        stripe_price_id,
        classes: Number(classes),
        name,
        description: description ?? null,
        renewal,
        type: type ?? null,
        cents: price.unit_amount ?? 0,
        currency: price.currency.toUpperCase(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Return the plan enriched with Stripe fields so the client can display
    // billing interval and product name immediately without a separate fetch.
    const product = price.product as Stripe.Product;
    return NextResponse.json(
      {
        ...plan,
        stripe_product_name: product.name,
        stripe_amount: price.unit_amount,
        stripe_currency: price.currency.toUpperCase(),
        stripe_interval: price.recurring?.interval ?? null,
        stripe_interval_count: price.recurring?.interval_count ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating payment plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 },
    );
  }
}
