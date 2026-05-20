import Stripe from "stripe";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Sign a Stripe webhook fixture and return the { body, headers } needed to
 * POST it to /api/webhooks/stripe.
 *
 * Fixtures live in tests/fixtures/stripe/*.json.
 * They are real Stripe event shapes captured from test-mode events.
 */
export function signWebhookFixture(fixtureName: string): {
  body: string;
  headers: Record<string, string>;
} {
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET_TEST;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET not set in .env.test — cannot sign webhook fixture",
    );
  }

  const fixturePath = join(
    process.cwd(),
    "tests/fixtures/stripe",
    `${fixtureName}.json`,
  );
  const body = readFileSync(fixturePath, "utf-8");

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp,
  });

  return {
    body,
    headers: {
      "stripe-signature": signature,
      "Content-Type": "application/json",
    },
  };
}

/**
 * Override fields on a fixture and re-sign it.
 * Useful for testing specific metadata or event states.
 */
export function signWebhookPayload(
  payload: object,
): { body: string; headers: Record<string, string> } {
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET_TEST;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set in .env.test");
  }

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp,
  });

  return {
    body,
    headers: {
      "stripe-signature": signature,
      "Content-Type": "application/json",
    },
  };
}
