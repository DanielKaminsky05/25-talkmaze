import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/src/services/supabase/server";
import { stripe } from "@/src/services/stripe/client";
import { isWithinRefundWindow } from "@/src/lib/payments/server/policies";
import { resolveStudentIdForBilling } from "@/src/lib/payments/server/resolveStudentIdForBilling";
import { getStripeCustomerIdForAccount } from "@/src/lib/payments/server/getStripeCustomerIdForAccount";
import { findActiveStripeSubscriptionByStudent } from "@/src/lib/payments/server/findActiveStripeSubscriptionByStudent";

type RefundTarget = {
  paymentIntentId: string | null;
  chargeId: string | null;
};

type LegacyInvoice = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
  charge?: string | Stripe.Charge | null;
};

function getExpandableId<T extends { id: string }>(
  value: string | T | null | undefined,
): string | null {
  return typeof value === "string" ? value : (value?.id ?? null);
}

function extractRefundTargetFromInvoice(invoice: Stripe.Invoice): RefundTarget {
  for (const invoicePayment of invoice.payments?.data ?? []) {
    const paymentIntentId = getExpandableId(
      invoicePayment.payment.payment_intent,
    );
    if (paymentIntentId?.startsWith("pi_")) {
      return { paymentIntentId, chargeId: null };
    }

    const chargeId = getExpandableId(invoicePayment.payment.charge);
    if (chargeId?.startsWith("ch_")) {
      return { paymentIntentId: null, chargeId };
    }
  }

  const confirmationSecret = invoice.confirmation_secret?.client_secret ?? null;
  const paymentIntentFromSecret =
    confirmationSecret?.split("_secret_")[0] ?? null;
  if (paymentIntentFromSecret?.startsWith("pi_")) {
    return { paymentIntentId: paymentIntentFromSecret, chargeId: null };
  }

  const legacyInvoice = invoice as LegacyInvoice;
  const legacyPaymentIntentId = getExpandableId(legacyInvoice.payment_intent);
  if (legacyPaymentIntentId?.startsWith("pi_")) {
    return { paymentIntentId: legacyPaymentIntentId, chargeId: null };
  }

  const legacyChargeId = getExpandableId(legacyInvoice.charge);
  if (legacyChargeId?.startsWith("ch_")) {
    return { paymentIntentId: null, chargeId: legacyChargeId };
  }

  return { paymentIntentId: null, chargeId: null };
}

/**
 * POST /api/subscriptions/cancel
 * Cancels the active student subscription both in Stripe and in Supabase.
 * When refund=true, issues a full refund and immediately cancels (within 28-day window only).
 * When refund=false (default), sets cancel_at_period_end=true so access continues until period end.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer studentId from request body (parent flow); fall back to active profile cookie (student flow)
    const body = await req.json().catch(() => ({}));
    const bodyStudentId: string | undefined = body?.studentId;
    const requestRefund: boolean = body?.refund === true;

    const studentResolution = await resolveStudentIdForBilling({
      supabase,
      accountId: user.id,
      requestedStudentId: bodyStudentId,
      errors: {
        studentNotFound: { error: "Student not found", status: 404 },
        noActiveStudentProfile: {
          error: "No active student profile",
          status: 400,
        },
      },
    });

    if (!studentResolution.ok) {
      return NextResponse.json(
        { error: studentResolution.error },
        { status: studentResolution.status },
      );
    }
    const studentId = studentResolution.studentId;

    // Find the active subscription record in Supabase
    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select("id, pending_stripe_schedule_id, current_period_start")
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Guard: refund is only valid within the 28-day window
    if (requestRefund) {
      if (!isWithinRefundWindow(subscription.current_period_start)) {
        return NextResponse.json(
          { error: "Refund window has expired" },
          { status: 403 },
        );
      }
    }

    const stripeCustomerId = await getStripeCustomerIdForAccount({
      supabase,
      accountId: user.id,
    });
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    const stripeSubscription = await findActiveStripeSubscriptionByStudent({
      customerId: stripeCustomerId,
      studentId,
    });

    if (!stripeSubscription) {
      return NextResponse.json(
        { error: "No Stripe subscription found" },
        { status: 404 },
      );
    }

    // If there's a pending schedule, release it before cancelling
    if (subscription.pending_stripe_schedule_id) {
      await stripe.subscriptionSchedules.release(
        subscription.pending_stripe_schedule_id,
      );
    }

    if (requestRefund) {
      // Retrieve latest invoice and resolve a refundable payment source.
      const latestInvoiceId =
        typeof stripeSubscription.latest_invoice === "string"
          ? stripeSubscription.latest_invoice
          : stripeSubscription.latest_invoice?.id;

      if (!latestInvoiceId) {
        return NextResponse.json(
          { error: "Could not locate invoice to refund" },
          { status: 422 },
        );
      }

      const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
        expand: [
          "payments.data.payment.payment_intent",
          "payments.data.payment.charge",
        ],
      });

      let refundTarget = extractRefundTargetFromInvoice(invoice);

      // If the invoice payload didn't include payment mappings, query them directly.
      if (!refundTarget.paymentIntentId && !refundTarget.chargeId) {
        const invoicePayments = await stripe.invoicePayments.list({
          invoice: latestInvoiceId,
          limit: 10,
          status: "paid",
          expand: ["data.payment.payment_intent", "data.payment.charge"],
        });

        for (const invoicePayment of invoicePayments.data) {
          const paymentIntentId = getExpandableId(
            invoicePayment.payment.payment_intent,
          );
          if (paymentIntentId?.startsWith("pi_")) {
            refundTarget = { paymentIntentId, chargeId: null };
            break;
          }

          const chargeId = getExpandableId(invoicePayment.payment.charge);
          if (chargeId?.startsWith("ch_")) {
            refundTarget = { paymentIntentId: null, chargeId };
            break;
          }
        }
      }

      // Last fallback: find a paid invoice on this subscription and read its payment mapping.
      if (!refundTarget.paymentIntentId && !refundTarget.chargeId) {
        const paidInvoices = await stripe.invoices.list({
          subscription: stripeSubscription.id,
          status: "paid",
          limit: 5,
          expand: [
            "data.payments.data.payment.payment_intent",
            "data.payments.data.payment.charge",
          ],
        });

        for (const paidInvoice of paidInvoices.data) {
          const target = extractRefundTargetFromInvoice(paidInvoice);
          if (target.paymentIntentId || target.chargeId) {
            refundTarget = target;
            break;
          }
        }
      }

      if (!refundTarget.paymentIntentId && !refundTarget.chargeId) {
        console.error("cancel (refund): no refundable payment source found", {
          stripeSubscriptionId: stripeSubscription.id,
          latestInvoiceId,
        });
        return NextResponse.json(
          { error: "Could not locate payment to refund" },
          { status: 422 },
        );
      }

      const refundParams: Stripe.RefundCreateParams = {
        reason: "requested_by_customer",
        ...(refundTarget.paymentIntentId
          ? { payment_intent: refundTarget.paymentIntentId }
          : { charge: refundTarget.chargeId! }),
      };

      await stripe.refunds.create(refundParams);

      // Immediately cancel the subscription in Stripe
      await stripe.subscriptions.cancel(stripeSubscription.id);

      // Mark as cancelled immediately in DB
      const { error: updateError } = await supabase
        .from("student_subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          pending_plan_id: null,
          pending_stripe_schedule_id: null,
          pending_effective_date: null,
          pending_created_at: null,
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error(
          "cancel (refund): error updating student_subscriptions:",
          updateError,
        );
      }
    } else {
      // Schedule cancellation at period end — access preserved until then
      await stripe.subscriptions.update(stripeSubscription.id, {
        cancel_at_period_end: true,
      });

      // Mark scheduled cancellation in DB — status stays "active" so access is preserved
      const { error: updateError } = await supabase
        .from("student_subscriptions")
        .update({
          cancelled_at: new Date().toISOString(),
          pending_plan_id: null,
          pending_stripe_schedule_id: null,
          pending_effective_date: null,
          pending_created_at: null,
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error(
          "cancel: error updating student_subscriptions:",
          updateError,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Cancel subscription error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
