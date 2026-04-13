"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
}: {
  renewalOptions: Plan[];
}) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

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
    router.push(
      `/payments/checkout?price_id=${selectedPlan.stripe_price_id}&name=${encodeURIComponent(selectedPlan.name)}&amount=${selectedPlan.cents}`,
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
          <CaretRight />
        </button>
      </div>
    </div>
  );
};

function CaretRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="26"
      viewBox="0 0 40 46"
      fill="none"
    >
      <path
        d="M26.5498 24.0408L12.6173 39.3071C12.3848 39.5619 12.0759 39.7041 11.7547 39.7041C11.4336 39.7041 11.1247 39.5619 10.8923 39.3071L10.8773 39.2898C10.7642 39.1663 10.6741 39.0176 10.6126 38.8527C10.551 38.6879 10.5193 38.5104 10.5193 38.331C10.5193 38.1516 10.551 37.9741 10.6126 37.8093C10.6741 37.6445 10.7642 37.4958 10.8773 37.3722L23.9973 22.9972L10.8773 8.62795C10.7642 8.50441 10.6741 8.35569 10.6126 8.19086C10.551 8.02603 10.5193 7.84852 10.5193 7.66914C10.5193 7.48976 10.551 7.31226 10.6126 7.14742C10.6741 6.98259 10.7642 6.83388 10.8773 6.71033L10.8923 6.69308C11.1247 6.43822 11.4336 6.29605 11.7548 6.29605C12.0759 6.29605 12.3848 6.43822 12.6173 6.69308L26.5498 21.9593C26.6723 22.0936 26.7698 22.2551 26.8365 22.434C26.9031 22.6129 26.9375 22.8055 26.9375 23.0001C26.9375 23.1947 26.9031 23.3873 26.8365 23.5662C26.7698 23.7451 26.6723 23.9066 26.5498 24.0408Z"
        fill="#65CFAD"
      />
    </svg>
  );
}
