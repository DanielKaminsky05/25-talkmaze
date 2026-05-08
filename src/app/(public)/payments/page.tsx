import { createClient } from "@/src/services/supabase/server";
import { PackageRenewaloptionsContainer } from "./_components/PackageRenewalOptionsContainer";
import CurrentSubscription from "./_components/CurrentSubscription";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { CaretIcon } from "@/src/components/ui/icons";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  renewal: string;
  currency: string;
  stripe_price_id: string;
  cents: number;
  classes: number;
  type: string | null;
}

/**
 * Top level page component for the /payments.
 * Contains the CurrentSubscription and the Plan Renewal Package Options
 */
export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string;
  }>;
}) {
  const { studentId: queryStudentId } = await searchParams;

  let backLink = "/profiles";
  let backLabel = "Return to Profiles";
  let resolvedStudentId: string | undefined;
  let hasSubscription = false;
  let currentPlanStripeId: string | null = null;
  let pendingPlanId: string | null = null;

  const supabase = await createClient();
  const { data: plans } = (await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)) as {
    data: Plan[] | null;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (queryStudentId && user) {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", queryStudentId)
      .eq("account_id", user.id)
      .maybeSingle();
    if (student) resolvedStudentId = student.id;
  }

  const activeProfile = await getActiveProfile();

  if (!resolvedStudentId && activeProfile?.type === "student") {
    resolvedStudentId = activeProfile.id;
  }

  if (resolvedStudentId) {
    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select(
        `
        id,
        pending_plan_id,
        plans!student_plans_plan_id_fkey (
          stripe_price_id
        )
      `,
      )
      .eq("student_id", resolvedStudentId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    hasSubscription = !!subscription;
    if (subscription) {
      const currentPlan = Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans;
      currentPlanStripeId = currentPlan?.stripe_price_id ?? null;
      pendingPlanId = subscription.pending_plan_id;
    }
  }

  const isParentFlow =
    !!resolvedStudentId && resolvedStudentId === queryStudentId;

  if (isParentFlow) {
    backLink = "/parent";
    backLabel = "Return to Dashboard";
  } else if (hasSubscription) {
    backLink = "/student";
    backLabel = "Return to Dashboard";
  }

  return (
    <div className="bg-[#2b4257] min-h-screen flex flex-col ">
      {/* Header - Contains back to dashboard button*/}
      <header className="top-0 z-10 bg-[#2b4257] px-8 py-5 flex items-center">
        <a
          href={backLink}
          className="inline-flex items-center gap-2 bg-[#1f2e3b] text-white no-underline text-[1rem] font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:bg-[#162230] transition-colors"
        >
          <CaretIcon direction="left" />
          {backLabel}
        </a>
      </header>

      {/* Main Content */}
      <main className="bg-[#1f2e3b] rounded-3xl mx-8 mb-10 px-12 py-10 flex-1 flex flex-col gap-2 items-center xl:px-[215px]">
        {/* Section 1 Heading - Current Subscription */}
        <div className="flex justify-center my-4">
          <span className="bg-white text-[#1f2e3b] text-[32px] font-bold px-20 py-0.5 rounded-[9px] border border-black/10 shadow-md">
            {hasSubscription
              ? "Current subscription in progress"
              : "Make your first subscription!"}
          </span>
        </div>
        {hasSubscription && (
          <CurrentSubscription studentId={resolvedStudentId} />
        )}

        {/* Section 2 Heading - Renewal / Upgrade Options */}
        <div className="flex justify-center my-4">
          <span className="bg-white text-[#1f2e3b] text-[32px] font-bold px-9 py-0.5 rounded-[9px] border border-black/10 shadow-md">
            TalkMaze Package Renewal Options
          </span>
        </div>

        <div id="renewal-options" className="w-full">
          <PackageRenewaloptionsContainer
            renewalOptions={plans ?? []}
            studentId={resolvedStudentId}
            hasActiveSubscription={hasSubscription}
            currentPlanStripeId={currentPlanStripeId}
            pendingPlanId={pendingPlanId}
          />
        </div>
      </main>
    </div>
  );
}
