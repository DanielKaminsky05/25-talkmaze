"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretIcon } from "@/app/(protected)/components/ui/icons";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
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
 * Component displaying all the renewal options as cards that user can select.
 * @param renewalOptions array containing all the plans to display
 */
export const PackageRenewaloptionsContainer = ({
  renewalOptions,
  studentId,

}: {
  renewalOptions: Plan[];
  studentId?: string;

}) => {


  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [signUpData, setSignUpData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("signup");
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log("Loaded signup:", parsed);
      setSignUpData(parsed);
    }
  }, [])
  // We want to display the plans from lowest cost to highest cost
  const sortedRenewalOptions = renewalOptions.sort(
    (firstPlan, secondPlan) => firstPlan.cents - secondPlan.cents,
  );

  /**
   * Handle the user confirming they want to continue to payment for their
   * selected plan.
   * Navigate to checkout page, passing query parameters: stripe_price_id
   */
  const handleContinue = () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      return;
    }
    const studentParam = studentId ? `&studentId=${encodeURIComponent(studentId)}` : "";

    let newUserParam = "";

    console.log("package renewable password: " + signUpData.password)
   console.log("Sending to api checkout:", {
  priceId: selectedPlan?.stripe_price_id,
  studentId,
  pFName: signUpData?.parentFirstName,
  pLName: signUpData?.parentLastName,
  sFName: signUpData?.studentFirstName,
  sLName: signUpData?.studentLastName,
  email: signUpData?.email,
  passwordExists: !!signUpData?.password,
});
    if (studentId === "new") {
      newUserParam = `&pFName=${encodeURIComponent(signUpData.parentFirstName)}&pLName=${encodeURIComponent(signUpData.parentLastName)}&sFName=${encodeURIComponent(signUpData.studentFirstName)}&sLName=${encodeURIComponent(signUpData.studentLastName)}&email=${encodeURIComponent(signUpData.email)}&password=${encodeURIComponent(signUpData.password)}`
    }
    router.push(
      `/payments/checkout?price_id=${encodeURIComponent(selectedPlan.stripe_price_id)}&name=${encodeURIComponent(selectedPlan.name)}&amount=${encodeURIComponent(selectedPlan.cents)}${studentParam}${newUserParam}`,
    );
  };

  return (
    <div className="flex flex-col gap-0 font-bold">
      <div className="grid grid-cols-3 gap-6 mb-7 max-[960px]:grid-cols-1">
        {sortedRenewalOptions.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
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
              {/* Bold plan name */}
              <h4 className="text-xl font-black text-[#1f2e3b] m-0 text-center">
                {plan.name}
              </h4>

              {/* White inner price box */}
              <div className="bg-white rounded-xl px-5 py-4 flex flex-col items-center gap-0.5 w-full shadow-[inset_0_0_4px_2px_rgba(0,0,0,0.10)]">
                <span className="text-[1rem]font-semibold text-[#4a6070] self-start">
                  {plan.type}
                </span>
                <div className="flex items-start leading-none w-full">
                  <span className="text-[56px] font-black text-[#1f2e3b] leading-none">
                    ${dollars}
                  </span>
                  <sup className="text-[1rem]font-semibold text-[#4a6070] mt-2.5 ml-0.5">
                    ({currencyTag})
                  </sup>
                </div>
                <span className=" text-[#4a6070] font-medium self-end">
                  {plan.renewal}
                </span>
              </div>

              {/* Description */}
              <p className="text-[1rem]text-[#2b4257] leading-relaxed text-center flex-1 m-0">
                {plan.description}
              </p>

              {/* Select button */}
              <button
                className="rounded-full py-3 w-full text-base font-bold shadow-md transition-[filter] hover:brightness-95 border-0 cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
                style={
                  isSelected
                    ? { backgroundColor: "#4db89a", color: "white" }
                    : { backgroundColor: "#65cfad", color: "#1f2e3b" }
                }
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Continue to payment — bottom right */}
      <div className="flex justify-end mt-1">
        <button
          className="bg-[#2b4257] text-white rounded-full px-9 py-3.5 text-base font-bold shadow-md hover:bg-[#1f2e3b] transition-colors border-0 cursor-pointer inline-flex items-center gap-2.5 disabled:cursor-not-allowed"
          onClick={handleContinue}
          disabled={!selectedPlan}
          style={{ opacity: !selectedPlan ? 0.5 : 1 }}
        >
          Continue to payment
          <CaretIcon direction="right" />
        </button>
      </div>
    </div>
  );
};
