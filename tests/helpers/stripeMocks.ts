/**
 * Stripe mock helpers for subscription integration tests.
 *
 * Each test file still owns its own `vi.mock("@/src/services/stripe/client", ...)`
 * block (vitest hoisting requires the literal path at file scope, and keeping
 * the mock surface visible in each file is easier to grep). What lives here:
 *
 *   - The fake-payload SHAPES (fakeStripeSub, etc.) that the route consumes
 *   - The seed helpers (mockStripeSubList, mockInvoiceForRefund, ...) that wire
 *     `.mockResolvedValueOnce(...)` for one call at a time
 *   - The shared fake IDs (FAKE_CUSTOMER_ID, FAKE_STRIPE_SUB_ID)
 *
 * The seed helpers import `stripe` from "@/src/services/stripe/client", which
 * resolves to the test file's mock instance (vitest applies the mock in the
 * test file's module graph; downstream imports see the same mock).
 */
import { vi } from "vitest";
import type Stripe from "stripe";
import { stripe } from "@/src/services/stripe/client";

export const FAKE_CUSTOMER_ID = "cus_test_owner_123";
export const FAKE_STRIPE_SUB_ID = "sub_test_123";
export const FAKE_INVOICE_ID = "in_test";

/**
 * Minimal Stripe subscription payload that satisfies
 * `findActiveStripeSubscriptionByStudent` and the schedule route's
 * `subscriptionItem.current_period_end` access.
 */
export function fakeStripeSub(studentId: string) {
  return {
    id: FAKE_STRIPE_SUB_ID,
    status: "active",
    metadata: { student_id: studentId },
    items: {
      data: [
        {
          id: "si_test",
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        },
      ],
    },
    latest_invoice: FAKE_INVOICE_ID,
  };
}

/** Seed stripe.subscriptions.list to return one subscription for `studentId`. */
export function mockStripeSubList(studentId: string) {
  vi.mocked(stripe.subscriptions.list).mockResolvedValueOnce({
    data: [fakeStripeSub(studentId)],
  } as Awaited<ReturnType<typeof stripe.subscriptions.list>>);
}

/** Seed stripe.invoices.retrieve to return an invoice with a pi_ client_secret. */
export function mockInvoiceForRefund() {
  vi.mocked(stripe.invoices.retrieve).mockResolvedValueOnce({
    id: FAKE_INVOICE_ID,
    confirmation_secret: { client_secret: "pi_test123_secret_abcdef" },
    payments: { data: [] },
  } as unknown as Stripe.Response<Stripe.Invoice>);
}

/** Seed stripe.customers.retrieve to return a fake customer (used by schedule). */
export function mockCustomer() {
  vi.mocked(stripe.customers.retrieve).mockResolvedValueOnce({
    id: FAKE_CUSTOMER_ID,
    object: "customer",
    name: "Test Parent",
    email: "test@example.com",
    phone: null,
  } as unknown as Stripe.Response<Stripe.Customer>);
}

/** Seed stripe.setupIntents.create to return a fake setup intent (schedule). */
export function mockSetupIntent() {
  vi.mocked(stripe.setupIntents.create).mockResolvedValueOnce({
    id: "seti_test",
    object: "setup_intent",
    client_secret: "seti_test_secret_abcdef",
  } as unknown as Stripe.Response<Stripe.SetupIntent>);
}
