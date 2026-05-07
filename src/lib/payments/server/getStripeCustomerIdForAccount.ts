import "server-only";

import { stripe } from "@/src/services/stripe/client";
import type { Database } from "@/src/services/supabase/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type GetStripeCustomerIdForAccountParams = {
  supabase: SupabaseClient<Database>;
  accountId: string;
  createIfMissing?: boolean;
  email?: string;
};

type GetStripeCustomerIdForAccountParamsCreate = Omit<
  GetStripeCustomerIdForAccountParams,
  "createIfMissing"
> & {
  createIfMissing: true;
};

type GetStripeCustomerIdForAccountParamsLookup =
  GetStripeCustomerIdForAccountParams & {
    createIfMissing?: false;
  };

/**
 * Looks up (and optionally creates) the Stripe customer ID linked to 
 * an account.
 *
 * Overload behavior:
 * - `createIfMissing: true` returns `Promise<string>` (always creates if absent).
 * - `createIfMissing` omitted/false returns `Promise<string | null>`.
 *
 * @param params Supabase/account context and optional create behavior.
 * @returns Existing or newly created Stripe customer ID, or `null` 
 *          when lookup-only and missing.
 */
export function getStripeCustomerIdForAccount(
  params: GetStripeCustomerIdForAccountParamsCreate,
): Promise<string>;
export function getStripeCustomerIdForAccount(
  params: GetStripeCustomerIdForAccountParamsLookup,
): Promise<string | null>;
export async function getStripeCustomerIdForAccount({
  supabase,
  accountId,
  createIfMissing = false,
  email,
}: GetStripeCustomerIdForAccountParams): Promise<string | null> {
  const { data: account } = await supabase
    .from("account")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .single();

  if (account?.stripe_customer_id) {
    return account.stripe_customer_id;
  }

  if (!createIfMissing) {
    return null;
  }

  // Create a Stripe customer lazily and persist the mapping for future calls.
  const customer = await stripe.customers.create({ email });
  const customerId = customer.id;

  await supabase
    .from("account")
    .update({ stripe_customer_id: customerId })
    .eq("id", accountId);

  return customerId;
}
