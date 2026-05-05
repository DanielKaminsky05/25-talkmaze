import { createClient } from "@/src/services/supabase/server";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import DonutChart from "./SessionsRemainingDonutChart";
import CancelSubscriptionButton from "./CancelSubscriptionButton";
import CancelScheduleButton from "./CancelScheduleButton";
import ResumeSubscriptionButton from "./ResumeSubscriptionButton";

export default async function CurrentSubscription({
  studentId,
}: {
  studentId?: string;
}) {
  const subscription = await getCurrentSubscription(studentId);

  if (!subscription) {
    return (
      <div className="bg-[#b1e7d6] rounded-2xl p-7 border border-black/10 shadow-md mb-6">
        <p className="text-[#2b4257] italic text-sm">
          No active subscription found.
        </p>
      </div>
    );
  }

  const plan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  const pendingPlan = Array.isArray(subscription.pending_plan)
    ? subscription.pending_plan[0]
    : subscription.pending_plan;

  const pendingEffectiveDate = subscription.pending_effective_date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(subscription.pending_effective_date))
    : null;

  const currentPeriodEnd = subscription.current_period_end
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(subscription.current_period_end))
    : null;

  const sessionsRemaining = subscription.sessions_remaining ?? 0;
  const totalSessions = plan?.classes ?? 0;

  return (
    <div className="bg-[#b1e7d6] rounded-2xl p-4 flex flex-row items-stretch gap-0 border border-black/10 shadow-md">
      {/* LEFT: plan name + description */}
      <div className="flex-1 flex flex-col gap-4 pr-8">
        <div className="bg-white rounded-xl px-5 py-3 text-xl text-center font-bold text-[#1f2e3b] shadow-[inset_0_0_4px_2px_rgba(0,0,0,0.12)]">
          {plan?.name}
        </div>
        <p className="text-[1rem] text-left mx-3 text-[#1f2e3b] leading-relaxed">
          {plan?.description}
        </p>
      </div>

      {/* Vertical divider */}
      <div className="w-px bg-[#1f2e3b]/20 self-stretch mx-8 shrink-0" />

      {/* RIGHT: policy banner + billing box + pending plan + cancel */}
      <div className="flex-2 flex flex-col items-center gap-4">
        {/* 28-day policy banner */}
        <div className="w-full text-center bg-white rounded-[9px] px-6 py-2 text-sm font-medium text-[#2b4257] shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)]">
          {subscription.cancelled_at && currentPeriodEnd
            ? `Plan ends ${currentPeriodEnd} and will not renew`
            : subscription.pending_plan_id && currentPeriodEnd
              ? `Current plan cancels on ${currentPeriodEnd}`
              : "You have 28 days after purchase to cancel your package"}
        </div>

        {/* Billing box: donut + sessions text */}
        <div className="w-full bg-white border-[3px] border-[#b1e7d6] rounded-2xl px-6 py-5 flex flex-row items-center gap-5">
          <DonutChart
            sessionsRemaining={sessionsRemaining}
            totalSessions={totalSessions}
          />
          <div className="flex items-center font-bold gap-1">
            <span className="text-[1rem] font-black text-[#d55b40] leading-none">
              {sessionsRemaining}
            </span>
            <span className="text-[1rem] font-semibold text-[#2b4257] leading-snug">
              Sessions Left in Payment Package
            </span>
          </div>
        </div>

        {/* Pending plan change info */}
        {subscription.pending_plan_id && pendingEffectiveDate && (
          <div className="w-full rounded-2xl border border-[#1f2e3b]/10 bg-white px-5 py-4 text-left shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[#2b4257] m-0">
                Plan change scheduled
              </p>
              <p className="text-sm text-[#2b4257] m-0">
                {pendingPlan?.name ?? "New plan"} starts on{" "}
                {pendingEffectiveDate}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="#renewal-options"
                  className="text-sm font-semibold text-[#2b4257] underline"
                >
                  Change plan
                </a>
                <CancelScheduleButton studentId={studentId} />
              </div>
            </div>
          </div>
        )}

        {/* Cancel / resume plan */}
        {subscription.cancelled_at ? (
          <div className="flex flex-col items-center gap-2">
            <ResumeSubscriptionButton studentId={studentId} />
          </div>
        ) : (
          <CancelSubscriptionButton studentId={studentId} />
        )}
      </div>
    </div>
  );
}

async function getCurrentSubscription(studentId?: string) {
  const supabase = await createClient();
  const id = studentId ?? (await getActiveProfile())?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("student_subscriptions")
    .select(
      `
      *,
      plans!student_plans_plan_id_fkey (
        id,
        name,
        description,
        renewal,
        currency,
        cents,
        classes,
        type
      ),
      pending_plan:plans!student_subscriptions_pending_plan_id_fkey (
        id,
        name,
        description,
        renewal,
        currency,
        cents,
        classes,
        type
      )
    `,
    )
    .eq("student_id", id)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}
