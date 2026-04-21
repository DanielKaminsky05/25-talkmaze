import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { assignCoachToStudent } from "@/app/(public)/onboarding/actions";

export async function POST(request: Request) {
  try {
<<<<<<< HEAD
=======
    // Read the raw body as text. Required by Stripe's signature verification,
    // which breaks if the body is parsed (e.g. via request.json()) first
    console.log("Webhook hit!")
>>>>>>> origin/coach-page-new
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
    }
    if (signature === null) {
      throw new Error("Stripe signature is not defined");
    }

    const event: Stripe.Event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );



    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!stripeCustomerId) {
        console.error("invoice.paid: no customer ID on invoice");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabase = createServiceRoleClient();

      const invoiceAny = invoice as any;
      const stripeSubscriptionId: string | undefined =
        invoiceAny.parent?.subscription_details?.subscription ??
        (typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id) ??
        undefined;

      console.log("invoice.paid: stripeSubscriptionId =", stripeSubscriptionId);

      if (stripeSubscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const {
          account_id: accountId,
          student_id: studentId,
          price_id: priceId,
        } = subscription.metadata ?? {};

        if (!accountId || !studentId || !priceId) {
          console.error(
            "invoice.paid: missing metadata on subscription",
            stripeSubscriptionId,
            subscription.metadata,
          );
        } else {
          const { data: plan, error: planError } = await supabase
            .from("plans")
            .select("id, classes, name")
            .eq("stripe_price_id", priceId)
            .single();

          if (planError || !plan) {
            console.error(
              "invoice.paid: error fetching plan for price_id:",
              priceId,
              planError,
            );
          } else {
            const subscriptionItem = subscription.items.data[0];
            const currentPeriodStart = new Date(
              subscriptionItem.current_period_start * 1000,
            ).toISOString();
            const currentPeriodEnd = new Date(
              subscriptionItem.current_period_end * 1000,
            ).toISOString();

            const { data: existing } = await supabase
              .from("student_subscriptions")
              .select("id")
              .eq("account_id", accountId)
              .eq("student_id", studentId)
              .eq("plan_id", plan.id)
              .order("current_period_end", { ascending: false })
              .limit(1);

            const existingId = existing?.[0]?.id;

            if (existingId) {
              const { error } = await supabase
                .from("student_subscriptions")
                .update({
                  status: "active",
                  current_period_start: currentPeriodStart,
                  current_period_end: currentPeriodEnd,
                  sessions_remaining: plan.classes,
                })
                .eq("id", existingId);
              if (error)
                console.error(
                  "invoice.paid: error updating student_subscription:",
                  error,
                );
              else console.log("invoice.paid: subscription renewed", existingId);
            } else {
              // Initial payment — insert and then assign a coach
              const { error } = await supabase
                .from("student_subscriptions")
                .insert({
                  account_id: accountId,
                  student_id: studentId,
                  plan_id: plan.id,
                  status: "active",
                  current_period_start: currentPeriodStart,
                  current_period_end: currentPeriodEnd,
                  sessions_remaining: plan.classes,
                });

              if (error) {
                console.error(
                  "invoice.paid: error creating student_subscription:",
                  error,
                );
              } else {
                console.log("invoice.paid: subscription created for student", studentId);
                try {
                  await assignCoachToStudent(studentId);
                  console.log(
                    "invoice.paid: coach assigned to student",
                    studentId,
                  );
                } catch (coachErr) {
                  console.error(
                    "invoice.paid: coach assignment failed:",
                    coachErr,
                  );
                }
              }
            }

            const { data: student } = await supabase
              .from("students")
              .select("first_name, last_name")
              .eq("id", studentId)
              .single();
            const paymentDescription = `Payment for ${student ? `${student.first_name} ${student.last_name}`.trim() : "student"} - ${plan.name}`;
            console.log("invoice.paid: paymentDescription =", paymentDescription);

            const baseUrl =
              process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            try {
              const lsRes = await fetch(
                `${baseUrl}/api/webhooks/stripe/learningSpace`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ student_id: studentId }),
                },
              );
              const lsBody = await lsRes.json();
              console.log(
                "invoice.paid: LessonSpace response:",
                lsRes.status,
                lsBody,
              );
            } catch (lessonSpaceError) {
              console.error(
                "invoice.paid: error creating LessonSpace:",
                lessonSpaceError,
              );
            }
          }
        }
      } else {
        console.warn("invoice.paid: no subscription ID found on invoice", invoice.id);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown webhook error";
    console.log(`Stripe Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}