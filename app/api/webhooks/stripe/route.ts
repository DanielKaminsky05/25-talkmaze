import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/services/stripe/client";
import { createServiceRoleClient } from "@/services/supabase/service";
import { assignCoachToStudent } from "@/app/(public)/onboarding/actions";
import { setActiveProfile } from "@/app/(public)/onboarding/actions";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

type SubscriptionItemWithPeriod = {
  price?: Stripe.Price | null;
  quantity?: number;
  current_period_start: number;
  current_period_end: number;
};

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events.
 *
 * For testing in local env set the STRIPE_WEBHOOK_SECRET key given by STRIPE CLI
 * Then run the command:
 * stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  try {
    // Read the raw body as text. Required by Stripe's signature verification,
    // which breaks if the body is parsed (e.g. via request.json()) first
    console.log("Webhook hit!");
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
    }
    if (signature === null) {
      throw new Error("Stripe signature is not defined");
    }

    // Verify the event came from Stripe and wasn't tampered with.
    // Throws if the signature is invalid, which returns a 400 to Stripe.
    const event: Stripe.Event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    /*
     STRIPE EVENT: setup_intent.succeeded
     Fires after the user confirms their payment method on the upgrade flow.
     Creates a Stripe Subscription Schedule with two phases so the new plan
     activates automatically at the end of the current billing period.
    */
    if (event.type === "setup_intent.succeeded") {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const {
        account_id: accountId,
        student_id: studentId,
        target_price_id: targetPriceId,
        stripe_subscription_id: stripeSubscriptionId,
        replace_schedule_id: replaceScheduleId,
      } = setupIntent.metadata ?? {};

      if (!accountId || !studentId || !targetPriceId || !stripeSubscriptionId) {
        console.error("setup_intent.succeeded: missing metadata", {
          accountId,
          studentId,
          targetPriceId,
          stripeSubscriptionId,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const stripeCustomerId =
        typeof setupIntent.customer === "string"
          ? setupIntent.customer
          : setupIntent.customer?.id;

      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      if (stripeCustomerId && paymentMethodId) {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        await stripe.subscriptions.update(stripeSubscriptionId, {
          default_payment_method: paymentMethodId,
        });
      }

      const subscription =
        await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const subscriptionItem = subscription.items
        .data[0] as unknown as SubscriptionItemWithPeriod;
      const currentPriceId = subscriptionItem?.price?.id ?? null;

      if (!currentPriceId) {
        console.error(
          "setup_intent.succeeded: missing current price",
          stripeSubscriptionId,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabase = createServiceRoleClient();
      const { data: existingSub } = await supabase
        .from("student_subscriptions")
        .select("id, pending_stripe_schedule_id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingSub) {
        console.error("setup_intent.succeeded: no active subscription", {
          studentId,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Release any previously scheduled plan before creating the new one
      const scheduleToRelease =
        replaceScheduleId || existingSub.pending_stripe_schedule_id || "";
      if (scheduleToRelease) {
        try {
          await stripe.subscriptionSchedules.release(scheduleToRelease);
        } catch (releaseError) {
          console.error(
            "setup_intent.succeeded: schedule release failed",
            releaseError,
          );
        }
      }

      // Create a two-phase schedule:
      // Phase 1 = current plan for the rest of the billing period
      // Phase 2 = new plan from period end onwards
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: stripeSubscriptionId,
      });

      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            items: [
              {
                price: currentPriceId,
                quantity: subscriptionItem?.quantity ?? 1,
              },
            ],
            start_date: subscriptionItem.current_period_start,
            end_date: subscriptionItem.current_period_end,
            proration_behavior: "none",
          },
          {
            items: [
              {
                price: targetPriceId,
                quantity: subscriptionItem?.quantity ?? 1,
              },
            ],
            start_date: subscriptionItem.current_period_end,
            proration_behavior: "none",
          },
        ],
      });

      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id")
        .eq("stripe_price_id", targetPriceId)
        .single();

      if (planError || !plan) {
        console.error(
          "setup_intent.succeeded: plan lookup failed",
          targetPriceId,
          planError,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const effectiveDate = new Date(
        subscriptionItem.current_period_end * 1000,
      ).toISOString();

      const { error: updateError } = await supabase
        .from("student_subscriptions")
        .update({
          pending_plan_id: plan.id,
          pending_effective_date: effectiveDate,
          pending_stripe_schedule_id: schedule.id,
          pending_created_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);

      if (updateError) {
        console.error(
          "setup_intent.succeeded: pending upgrade update failed",
          updateError,
        );
      } else {
        console.log(
          "setup_intent.succeeded: plan change scheduled",
          existingSub.id,
          "→",
          targetPriceId,
          "effective",
          effectiveDate,
        );
      }
    }

    /*
     STRIPE EVENT: invoice_payment.paid
     Fires when a subscription schedule phase transitions to the next plan.
     Regular renewals and new signups fire invoice.paid instead.
     This handler only activates a pending queued plan - all other cases bail early.
    */
    if (event.type === "invoice_payment.paid") {
      const invoicePayment = event.data.object as {
        invoice: string | { id: string };
      };
      const invoiceId =
        typeof invoicePayment.invoice === "string"
          ? invoicePayment.invoice
          : invoicePayment.invoice?.id;

      if (!invoiceId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const invoice = await stripe.invoices.retrieve(invoiceId);
      const invoiceAny = invoice as unknown as {
        subscription?: string;
        parent?: { subscription_details?: { subscription?: string } };
      };
      const subscriptionId =
        typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.parent?.subscription_details?.subscription;

      if (!subscriptionId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const studentId = subscription.metadata?.student_id;

      if (!studentId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabase = createServiceRoleClient();
      const { data: subRecord } = await supabase
        .from("student_subscriptions")
        .select("id, pending_plan_id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .maybeSingle();

      if (!subRecord?.pending_plan_id) {
        // No pending plan — regular renewal handled by invoice.paid
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const newPriceId = subscription.items.data[0].price.id;
      const { data: plan } = await supabase
        .from("plans")
        .select("id, name, classes")
        .eq("stripe_price_id", newPriceId)
        .single();

      if (!plan || plan.id !== subRecord.pending_plan_id) {
        console.error("invoice_payment.paid: price/plan mismatch", {
          newPriceId,
          pendingPlanId: subRecord.pending_plan_id,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const item = subscription.items
        .data[0] as unknown as SubscriptionItemWithPeriod;
      const currentPeriodStart = new Date(
        item.current_period_start * 1000,
      ).toISOString();
      const currentPeriodEnd = new Date(
        item.current_period_end * 1000,
      ).toISOString();

      await supabase
        .from("student_subscriptions")
        .update({
          plan_id: plan.id,
          sessions_remaining: plan.classes,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          pending_plan_id: null,
          pending_effective_date: null,
          pending_stripe_schedule_id: null,
          pending_created_at: null,
        })
        .eq("id", subRecord.id);

      await assignCoachToStudent(studentId, plan.classes);

      console.log(
        "invoice_payment.paid: pending plan activated",
        studentId,
        "→",
        plan.name,
      );
    }

    /*
     STRIPE EVENT: invoice.paid
     Fires when a payment succeeds - both for the very first subscription payment
     and for every automatic monthly renewal.
     This is the main entry point for provisioning a student's access.
    */
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      console.log("Invoice: " + JSON.stringify(invoice));

      // Extract the Stripe customer ID from the invoice.
      const stripeCustomerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (!stripeCustomerId) {
        console.error("invoice.paid: no customer ID on invoice");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Use the service role client so we can bypass RLS
      const supabase = createServiceRoleClient();

      // Extract the subscription ID from the invoice.
      const invoiceAny = invoice as any;
      const stripeSubscriptionId: string | undefined =
        invoiceAny.parent?.subscription_details?.subscription ??
        (typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id) ??
        undefined;

      console.log("invoice.paid: stripeSubscriptionId =", stripeSubscriptionId);

      if (stripeSubscriptionId) {
        // Fetch the full subscription object so we can read its metadata
        // We expand 'default_payment_method' so we can sync the customer's
        // billing name/email/phone back to their Stripe customer record.
        const subscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
          { expand: ["default_payment_method"] },
        );

        // Keep the Stripe customer's contact info up to date with whatever
        // the user entered on the payment form.
        const pm =
          subscription.default_payment_method as Stripe.PaymentMethod | null;
        if (pm?.billing_details) {
          const { name, email, phone } = pm.billing_details;
          await stripe.customers.update(stripeCustomerId, {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
          });
        }

        // Pull the metadata that was attached to the subscription at checkout
        //
        // EXISTING USER flow: account_id and student_id are real Supabase UUIDs
        //
        // NEW USER (sign up form): account_id and student_id are both "new"
        // Since the account didn't exist yet when the subscription was created
        // In that case, the signup info (names, email, password) is also stored
        // here so we can create the account after the payment succeeds.
        const {
          account_id: dummyAccountId,
          student_id: dummyStudentId,
          price_id: priceId,
          parent_first_name: parent_first_name,
          parent_last_name: paraent_last_name,
          student_first_name: student_first_name,
          student_last_name: student_last_name,
          email: email,
          password: password,
        } = subscription.metadata ?? {};

        // Overwrite these with the real IDs once the account is created below
        let studentId = dummyStudentId;
        let accountId = dummyAccountId;
        const isNewSignup = accountId === "new" || studentId === "new";

        if (!accountId || !studentId || !priceId) {
          console.error(
            "invoice.paid: missing metadata on subscription",
            stripeSubscriptionId,
            subscription.metadata,
          );
        } else {
          // This block only runs when the subscription was created before the
          // user had an account - i.e. they signed up and paid in one shot.
          if (accountId === "new" || studentId === "new") {
            console.log("signing up new user");
            console.log("User password: " + password);

            // Create the Supabase auth user (email + password).
            const { data: signUpData, error: signUpDataError } =
              await supabase.auth.signUp({ email, password });

            if (signUpDataError || !signUpData.user) {
              console.log("Error signing up new user: " + signUpDataError);
              return NextResponse.json({
                status: 500,
                message: "Unable to sign-up new user, please contact admin",
              });
            }

            // Create the record in our 'account' table.
            // 'new: true' signals that the user still needs to complete
            // their profile setup (phone number, PIN) on first login.
            const insertIntoAccountTable = await supabase
              .from("account")
              .insert({
                id: signUpData.user.id,
                email: email,
                role: 1,
                stripe_customer_id: stripeCustomerId,
                new: true,
              })
              .select()
              .single();
            console.log(
              "Insert into account: " +
                JSON.stringify(insertIntoAccountTable.data),
            );

            // Update accountId so the rest of this handler uses the real UUID
            accountId = signUpData.user.id;

            // Create the student profile.
            const { data: insertIntoStudents, error: insertIntoStudentsError } =
              await supabase
                .from("students")
                .insert({
                  account_id: insertIntoAccountTable.data.id,
                  first_name: student_first_name,
                  last_name: student_last_name,
                  is_setup_complete: false,
                })
                .select()
                .single();

            if (insertIntoStudentsError || !insertIntoStudents) {
              return NextResponse.json({
                status: 500,
                message:
                  "Error inserting student for new account, please contact admin",
              });
            }

            // Update studentId so the subscription links to the real student
            studentId = insertIntoStudents.id;

            // Create the parent profile.
            const { data: insertIntoParents, error: insertIntoParentsError } =
              await supabase
                .from("parents")
                .insert({
                  account_id: insertIntoAccountTable.data.id,
                  billing_email: email,
                  first_name: parent_first_name,
                  last_name: paraent_last_name,
                })
                .select()
                .single();
            if (insertIntoParentsError) {
              return NextResponse.json({
                status: 500,
                message:
                  "Error inserting parent for new account, please contact admin",
              });
            }

            // Update the Stripe subscription metadata with the real IDs
            await stripe.subscriptions.update(stripeSubscriptionId, {
              metadata: {
                account_id: accountId,
                student_id: studentId,
                price_id: priceId,
                parent_first_name: "",
                parent_last_name: "",
                student_first_name: "",
                student_last_name: "",
                email: "",
                password: "",
              },
            });
          }

          // ---------------------------------------------------------------
          // Runs for BOTH new and existing users
          // Look up our internal plan by the Stripe price ID so we know
          // how many classes to grant.
          // ---------------------------------------------------------------
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

            // Check whether this student already has a subscription record in
            // our database. If they do, this invoice is a renewal; if not, it's
            // their first payment
            const { data: existing } = await supabase
              .from("student_subscriptions")
              .select("id, pending_plan_id, pending_stripe_schedule_id")
              .eq("account_id", accountId)
              .eq("student_id", studentId)
              .order("current_period_end", { ascending: false })
              .limit(1);

            const existingRecord = existing?.[0];
            const existingId = existingRecord?.id;

            if (existingId) {
              // RENEWAL: update the existing subscription record with the new
              // billing period and reset the session count for the new cycle.
              //
              // If the incoming plan matches the pending plan, this means the
              // Subscription Schedule just activated Phase 2 - clear pending_*.
              const isScheduledPlanActivating =
                existingRecord?.pending_plan_id === plan.id;
              const pendingReset = isScheduledPlanActivating
                ? {
                    pending_plan_id: null,
                    pending_effective_date: null,
                    pending_stripe_schedule_id: null,
                    pending_created_at: null,
                  }
                : {};

              const { error } = await supabase
                .from("student_subscriptions")
                .update({
                  plan_id: plan.id,
                  status: "active",
                  current_period_start: currentPeriodStart,
                  current_period_end: currentPeriodEnd,
                  sessions_remaining: plan.classes,
                  ...pendingReset,
                })
                .eq("id", existingId);
              if (error) {
                console.error(
                  "invoice.paid: error updating student_subscription:",
                  error,
                );
              } else {
                console.log("invoice.paid: subscription renewed", existingId);
                try {
                  // Schedule the next batch of sessions with a coach
                  await assignCoachToStudent(studentId, plan.classes);
                  console.log(
                    "invoice.paid: sessions bulk-generated for renewed student",
                    studentId,
                  );
                } catch (coachErr) {
                  console.error(
                    "invoice.paid: session generation failed:",
                    coachErr,
                  );
                }
              }
            } else {
              // FIRST PAYMENT: insert a brand new subscription record and
              // kick off coach assignment
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
                console.log(
                  "invoice.paid: subscription created for student",
                  studentId,
                );
                if (isNewSignup) {
                  // Minimal signup students have no availability yet.
                  // Coach assignment runs after the parent completes the
                  // student setup form in the parent portal.
                  console.log(
                    "invoice.paid: skipping coach assignment for new signup student (no availability yet)",
                    studentId,
                  );
                } else {
                  try {
                    await assignCoachToStudent(studentId, plan.classes);
                    console.log(
                      "invoice.paid: coach assigned & sessions bulk-generated for student",
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
            }

            // Provision a LessonSpace virtual classroom room for the student.
            // This is a separate internal API that creates/updates the room
            // in the LessonSpace service.
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
        console.warn(
          "invoice.paid: no subscription ID found on invoice",
          invoice.id,
        );
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
