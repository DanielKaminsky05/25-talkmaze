import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { stripe } from "@/services/stripe/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

/**
 * POST /api/subscriptions/resume
 * Resumes auto-renewal for a subscription that was scheduled to cancel at period end.
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

    const body = await req.json().catch(() => ({}));
    const bodyStudentId: string | undefined = body?.studentId;

    let studentId: string | undefined;

    if (bodyStudentId) {
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("id", bodyStudentId)
        .eq("account_id", user.id)
        .maybeSingle();
      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 },
        );
      }
      studentId = student.id;
    } else {
      const activeProfile = await getActiveProfile();
      if (!activeProfile || activeProfile.type !== "student") {
        return NextResponse.json(
          { error: "No active student profile" },
          { status: 400 },
        );
      }
      studentId = activeProfile.id;
    }

    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .not("cancelled_at", "is", null)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: "No cancellation scheduled for this subscription" },
        { status: 404 },
      );
    }

    const { data: account } = await supabase
      .from("account")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!account?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 404 },
      );
    }

    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: account.stripe_customer_id,
      status: "active",
    });

    const stripeSubscription = stripeSubscriptions.data.find(
      (sub) => sub.metadata?.student_id === studentId,
    );

    if (!stripeSubscription) {
      return NextResponse.json(
        { error: "No Stripe subscription found" },
        { status: 404 },
      );
    }

    await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: false,
    });

    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({ cancelled_at: null })
      .eq("id", subscription.id);

    if (updateError) {
      console.error(
        "resume: error updating student_subscriptions:",
        updateError,
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Resume subscription error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
