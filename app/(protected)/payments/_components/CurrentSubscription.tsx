import { createClient } from "@/utils/supabase/server";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import DonutChart from "./SessionsRemainingDonutChart";
import CancelSubscriptionButton from "./CancelSubscriptionButton";

/**
 * Component displaying the information about a student's subscription status.
 * Includes details about plan, coaching sessions remaining, and cancelling.
 */
export default async function CurrentSubscription({ studentId }: { studentId?: string }) {
  // Retrieve the student's subscription record
  const subscription = await getCurrentSubscription(studentId);

  // If student has no active subscription, render the following
  if (!subscription) {
    return (
      <div className="bg-[#b1e7d6] rounded-2xl p-7 border border-black/10 shadow-md mb-6">
        <p className="text-[#2b4257] italic text-sm">
          No active subscription found.
        </p>
      </div>
    );
  }

  // Get the details of
  const plan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  const sessionsRemaining = subscription.sessions_remaining ?? 0;
  const totalSessions = plan?.classes ?? 0;

  return (
    <div className="bg-[#b1e7d6] rounded-2xl p-4 flex flex-row items-stretch gap-0 border border-black/10 shadow-md">
      {/* LEFT: plan name + description */}
      <div className="flex-1 flex flex-col item- gap-4 pr-8">
        <div className="bg-white rounded-xl px-5 py-3 text-xl text-center font-bold text-[#1f2e3b] shadow-[inset_0_0_4px_2px_rgba(0,0,0,0.12)]">
          {plan?.name}
        </div>
        <p className="text-[1rem] text-left mx-3 text-[#1f2e3b] leading-relaxed">
          {plan?.description}
        </p>
      </div>

      {/* Vertical divider */}
      <div className="w-px bg-[#1f2e3b]/20 self-stretch mx-8 shrink-0" />

      {/* RIGHT: policy banner + billing box + cancel button */}
      <div className="flex-2 flex flex-col items-center gap-4">
        {/* 28-day policy banner */}
        <div className="w-full text-center bg-white rounded-full px-6 py-2 text-sm font-medium text-[#2b4257] shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)]">
          You have 28 days after purchase to cancel your package
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

        {/* Cancel plan */}
        <CancelSubscriptionButton studentId={studentId} />
      </div>
    </div>
  );
}

/**
 * Get the subscription record of the current student
 * @returns object containing the current student's subscription record
 */
async function getCurrentSubscription(studentId?: string) {
  const supabase = await createClient();
  const id = studentId ?? (await getActiveProfile())?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("student_subscriptions")
    .select(
      `
      *,
      plans (
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
