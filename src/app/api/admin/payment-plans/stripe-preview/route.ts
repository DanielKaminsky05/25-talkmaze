import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/src/services/stripe/client";
import Stripe from "stripe";

/**
 * GET /api/admin/payment-plans/stripe-preview?priceId=price_xxx
 *
 * Fetches display metadata for a Stripe price without writing anything to the
 * database. Used by the "Add plan" form to auto-populate fields (name, amount,
 * interval) after the admin enters a Stripe Price ID, so they can verify what
 * they're importing before saving.
 *
 * @query priceId - The Stripe Price ID to look up (e.g. "price_xxx")
 *
 * @returns 200 { product_name, amount, currency, interval, interval_count }
 * @returns 400 If priceId query param is missing.
 * @returns 404 If the price doesn't exist in Stripe.
 */
export async function GET(req: NextRequest) {
  const priceId = req.nextUrl.searchParams.get("priceId");

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  try {
    // Expand the product so we can return the product name in a single API call
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    const product = price.product as Stripe.Product;

    return NextResponse.json({
      product_name: product.name,
      amount: price.unit_amount,
      currency: price.currency.toUpperCase(),
      // recurring is null for one-time prices
      interval: price.recurring?.interval ?? null,
      interval_count: price.recurring?.interval_count ?? null,
    });
  } catch {
    // Stripe throws if the price ID doesn't exist or is malformed
    return NextResponse.json(
      { error: "Stripe price ID not found" },
      { status: 404 },
    );
  }
}
