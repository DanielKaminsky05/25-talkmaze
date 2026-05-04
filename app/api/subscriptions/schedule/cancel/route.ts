import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { stripe } from "@/services/stripe/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

type CancelScheduleBody = {
  studentId?: string;
};

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

    const body = (await req.json().catch(() => ({}))) as CancelScheduleBody;
    const bodyStudentId = body?.studentId;

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
      .select("id, pending_stripe_schedule_id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.pending_stripe_schedule_id) {
      return NextResponse.json(
        { error: "No pending plan change found" },
        { status: 404 },
      );
    }

    try {
      await stripe.subscriptionSchedules.release(
        subscription.pending_stripe_schedule_id,
      );
    } catch (releaseError) {
      console.error("schedule-cancel: schedule release failed", releaseError);
    }

    const { error: updateError } = await supabase
      .from("student_subscriptions")
      .update({
        pending_plan_id: null,
        pending_effective_date: null,
        pending_stripe_schedule_id: null,
        pending_created_at: null,
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("schedule-cancel: update error", updateError);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Cancel plan change error:", err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
