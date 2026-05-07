import "server-only";

import { stripe } from "@/src/services/stripe/client";
import type Stripe from "stripe";

type FindActiveStripeSubscriptionByStudentParams = {
  customerId: string;
  studentId: string;
};

/**
 * Finds the active Stripe subscription for a specific student under one 
 * customer.
 *
 * We store `student_id` in Stripe subscription metadata and use it as the
 * link from Stripe subscriptions back to Talkmaze app students.
 *
 * @param params Stripe customer and app student identifiers.
 * @returns Matching active Stripe subscription, or `null` when not found.
 */
export async function findActiveStripeSubscriptionByStudent({
  customerId,
  studentId,
}: FindActiveStripeSubscriptionByStudentParams): Promise<Stripe.Subscription | null> {
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
  });

  return (
    stripeSubscriptions.data.find(
      (subscription) => subscription.metadata?.student_id === studentId,
    ) ?? null
  );
}
