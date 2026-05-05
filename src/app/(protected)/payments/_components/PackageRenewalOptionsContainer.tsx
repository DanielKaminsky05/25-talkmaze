"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export const PackageRenewaloptionsContainer = ({
  renewalOptions,
  studentId,
  hasActiveSubscription = false,
  currentPlanStripeId,
  pendingPlanId,
}: {
  renewalOptions: Plan[];
  studentId?: string;
  hasActiveSubscription?: boolean;
  currentPlanStripeId?: string | null;
  pendingPlanId?: string | null;
}) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [signUpData, setSignUpData] = useState<Record<string, string> | null>(
    null,
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("signup");
    if (saved) {
      try {
        setSignUpData(JSON.parse(saved));
      } catch {
        // ignore malformed signup data
      }
    }
  }, []);

  const sortedRenewalOptions = [...renewalOptions].sort(
    (a, b) => a.cents - b.cents,
  );

  const isScheduleMode = hasActiveSubscription;

  const handleContinue = () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      return;
    }
    const studentParam = studentId
      ? `&studentId=${encodeURIComponent(studentId)}`
      : "";
    const modeParam = isScheduleMode ? "&mode=schedule" : "";

    let newUserParam = "";
    if (studentId === "new" && signUpData) {
      newUserParam =
        `&pFName=${encodeURIComponent(signUpData.parentFirstName ?? "")}` +
        `&pLName=${encodeURIComponent(signUpData.parentLastName ?? "")}` +
        `&sFName=${encodeURIComponent(signUpData.studentFirstName ?? "")}` +
        `&sLName=${encodeURIComponent(signUpData.studentLastName ?? "")}` +
        `&email=${encodeURIComponent(signUpData.email ?? "")}` +
        `&password=${encodeURIComponent(signUpData.password ?? "")}`;
    }

    router.push(
      `/payments/checkout?price_id=${encodeURIComponent(selectedPlan.stripe_price_id)}&name=${encodeURIComponent(selectedPlan.name)}&amount=${encodeURIComponent(selectedPlan.cents)}${studentParam}${modeParam}${newUserParam}`,
    );
  };

  return (
    <div className="flex flex-col gap-0 font-bold">
      {isScheduleMode && (
        <div className="mb-4 rounded-2xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-center text-[#2b4257] shadow-md">
          Plan changes start when your current plan ends. You will not be
          charged today.
        </div>
      )}
      {isScheduleMode && !!pendingPlanId && (
        <div className="mb-4 rounded-2xl border border-black/10 bg-[#fef3c7] px-6 py-3 text-sm font-semibold text-center text-[#7a4b0f] shadow-md">
          You already have a plan change scheduled. Selecting a new plan will
          replace it.
        </div>
      )}
      <div className="grid grid-cols-3 gap-6 mb-7 max-[960px]:grid-cols-1">
        {sortedRenewalOptions.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          const isPending = pendingPlanId === plan.id;
          const isCurrent =
            isScheduleMode && plan.stripe_price_id === currentPlanStripeId;
          const dollars = Math.floor(plan.cents / 100);
          const currencyTag = plan.currency === "CAD" ? "CA" : plan.currency;

          return (
            <div
              key={plan.id}
              className="bg-[#b1e7d6] rounded-2xl p-6 flex flex-col items-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.18)] border border-black/10 transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
              style={
                isSelected
                  ? { outline: "2px solid #65cfad" }
                  : { outline: "2px solid transparent" }
              }
            >
              <h4 className="text-xl font-black text-[#1f2e3b] m-0 text-center">
                {plan.name}
              </h4>

              {isCurrent && (
                <span className="rounded-full bg-[#2b4257] px-3 py-1 text-xs font-bold text-white">
                  Current plan
                </span>
              )}
              {isPending && !isCurrent && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2b4257]">
                  Plan change scheduled
                </span>
              )}

              <div className="bg-white rounded-xl px-5 py-4 flex flex-col items-center gap-0.5 w-full shadow-[inset_0_0_4px_2px_rgba(0,0,0,0.10)]">
                <span className="text-[1rem] font-semibold text-[#4a6070] self-start">
                  {plan.type}
                </span>
                <div className="flex items-start leading-none w-full">
                  <span className="text-[56px] font-black text-[#1f2e3b] leading-none">
                    ${dollars}
                  </span>
                  <sup className="text-[1rem] font-semibold text-[#4a6070] mt-2.5 ml-0.5">
                    ({currencyTag})
                  </sup>
                </div>
                <span className="text-[#4a6070] font-medium self-end">
                  {plan.renewal}
                </span>
              </div>

              <p className="text-[1rem] text-[#2b4257] leading-relaxed text-center flex-1 m-0">
                {plan.description}
              </p>

              <button
                className="rounded-full py-3 w-full text-base font-bold shadow-md transition-[filter] border-0"
                onClick={() => !isCurrent && setSelectedPlan(plan)}
                disabled={isCurrent}
                style={
                  isCurrent
                    ? {
                        backgroundColor: "#9ca3af",
                        color: "white",
                        cursor: "default",
                      }
                    : isSelected
                      ? {
                          backgroundColor: "#4db89a",
                          color: "white",
                          cursor: "pointer",
                        }
                      : {
                          backgroundColor: "#65cfad",
                          color: "#1f2e3b",
                          cursor: "pointer",
                        }
                }
              >
                {isCurrent
                  ? "Current plan"
                  : isSelected
                    ? "Selected"
                    : isScheduleMode
                      ? "Select plan"
                      : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-1">
        <button
          className="bg-[#2b4257] text-white rounded-full px-9 py-3.5 text-base font-bold shadow-md hover:bg-[#1f2e3b] transition-colors border-0 cursor-pointer inline-flex items-center gap-2.5 disabled:cursor-not-allowed"
          onClick={handleContinue}
          disabled={!selectedPlan}
          style={{ opacity: !selectedPlan ? 0.5 : 1 }}
        >
          {isScheduleMode ? "Schedule next plan" : "Continue to payment"}
          <CaretIcon direction="right" />
        </button>
      </div>
    </div>
  );
};
