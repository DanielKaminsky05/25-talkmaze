import { createClient } from "@/services/supabase/server";
import { PackageRenewaloptionsContainer } from "./_components/PackageRenewalOptionsContainer";
import CurrentSubscription from "./_components/CurrentSubscription";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

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
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId: queryStudentId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Resolve which student this page is for.
  // If ?studentId= is present, verify the account owns that student.
  // Otherwise fall back to the active profile cookie.
  let resolvedStudentId: string | undefined;

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

  // Fetch all Subscription plans from the database so that it can be displayed
  // in renewal options
  const { data: plans } = (await supabase.from("plans").select("*")) as {
    data: Plan[] | null;
  };

  // Check if student has an active subscription to determine back link
  let hasSubscription = false;
  if (resolvedStudentId) {
    const { data: subscription } = await supabase
      .from("student_subscriptions")
      .select("id")
      .eq("student_id", resolvedStudentId)
      .eq("status", "active")
      .maybeSingle();
    hasSubscription = !!subscription;
  }

  const isParentFlow = !!resolvedStudentId && resolvedStudentId === queryStudentId;
  const backLink = isParentFlow ? "/parent" : hasSubscription ? "/home" : "/profiles";
  const backLabel = isParentFlow ? "Return to Dashboard" : hasSubscription ? "Return to Dashboard" : "Return to Profiles";

  return (
    <div className="bg-[#2b4257] min-h-screen flex flex-col ">
      {/* Header - Contains back to dashboard button*/}
      <header className="top-0 z-10 bg-[#2b4257] px-8 py-5 flex items-center">
        <a
          href={backLink}
          className="inline-flex items-center gap-2 bg-[#1f2e3b] text-white no-underline text-[1rem] font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:bg-[#162230] transition-colors"
        >
          <CaretRight />
          {backLabel}
        </a>
      </header>

      {/* Main Content */}
      <main className="bg-[#1f2e3b] rounded-3xl mx-8 mb-10 px-12 py-10 flex-1 flex flex-col gap-2 items-center xl:px-[215px]">
        {/* Section 1 Heading - Current Subscription */}
        <div className="flex justify-center my-4">
          <span className="bg-white text-[#1f2e3b] text-[32px] font-bold px-20 py-0.5 rounded-[9px] border border-black/10 shadow-md">
            Current subscription in progress
          </span>
        </div>
        <CurrentSubscription studentId={resolvedStudentId} />

        {/* Section 2 Heading - Renewal Options*/}
        <div className="flex justify-center my-4">
          <span className="bg-white text-[#1f2e3b] text-[32px] font-bold px-9 py-0.5 rounded-[9px] border border-black/10 shadow-md">
            TalkMaze Package Renewal Options
          </span>
        </div>

        <PackageRenewaloptionsContainer renewalOptions={plans ?? []} studentId={resolvedStudentId} />
      </main>
    </div>
  );
}

/**
 * UI SVG sub-component - Caret pointing right
 */
function CaretRight() {
  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="26"
        viewBox="0 0 40 46"
        fill="none"
      >
        <path
          d="M13.4503 24.0408L27.3828 39.3071C27.6152 39.5619 27.9241 39.7041 28.2453 39.7041C28.5664 39.7041 28.8753 39.5619 29.1078 39.3071L29.1228 39.2898C29.2358 39.1663 29.3259 39.0176 29.3874 38.8527C29.449 38.6879 29.4807 38.5104 29.4807 38.331C29.4807 38.1516 29.449 37.9741 29.3874 37.8093C29.3259 37.6445 29.2358 37.4958 29.1228 37.3722L16.0028 22.9972L29.1228 8.62795C29.2358 8.50441 29.3259 8.35569 29.3874 8.19086C29.449 8.02603 29.4807 7.84852 29.4807 7.66914C29.4807 7.48976 29.449 7.31226 29.3874 7.14742C29.3259 6.98259 29.2358 6.83388 29.1228 6.71033L29.1078 6.69308C28.8753 6.43822 28.5664 6.29605 28.2453 6.29605C27.9241 6.29605 27.6152 6.43822 27.3828 6.69308L13.4503 21.9593C13.3277 22.0936 13.2302 22.2551 13.1635 22.434C13.0969 22.6129 13.0625 22.8055 13.0625 23.0001C13.0625 23.1947 13.0969 23.3873 13.1635 23.5662C13.2302 23.7451 13.3277 23.9066 13.4503 24.0408Z"
          fill="#65CFAD"
        />
      </svg>
    </div>
  );
}
