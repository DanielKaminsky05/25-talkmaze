"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  studentId?: string;
  isEligibleForRefund: boolean;
  periodEndDate: string | null;
  refundOnly?: boolean;
};

type UIState =
  | "idle"
  | "choosing"
  | "confirmingRefund"
  | "confirmingNoRenew"
  | "loading";

export default function CancelSubscriptionButton({
  studentId,
  isEligibleForRefund,
  periodEndDate,
  refundOnly = false,
}: Props) {
  const [state, setState] = useState<UIState>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(refund: boolean) {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, refund }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel subscription");
        setState(refund ? "confirmingRefund" : "confirmingNoRenew");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to cancel subscription");
      setState(refund ? "confirmingRefund" : "confirmingNoRenew");
    }
  }

  function handleInitialClick() {
    setError(null);
    if (refundOnly) {
      setState("confirmingRefund");
    } else if (isEligibleForRefund) {
      setState("choosing");
    } else {
      setState("confirmingNoRenew");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={handleInitialClick}
        className={
          refundOnly
            ? "bg-red-600 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:bg-red-700 transition-colors cursor-pointer border-0"
            : "bg-[#2b4257] text-white rounded-full px-16 py-3 text-sm font-semibold shadow-md hover:bg-[#1f2e3b] transition-colors cursor-pointer border-0"
        }
      >
        {refundOnly ? "Cancel & get full refund" : "Cancel plan"}
      </button>
    );
  }

  if (state === "choosing") {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm font-semibold text-[#2b4257]">
          How would you like to cancel?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Option A: Refund */}
          <button
            onClick={() => setState("confirmingRefund")}
            className="flex-1 flex flex-col gap-1 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-left cursor-pointer hover:bg-red-100 transition-colors"
          >
            <span className="text-sm font-bold text-red-700">
              Cancel &amp; get full refund
            </span>
            <span className="text-xs text-red-600">
              Subscription ends immediately. Full payment refunded.
            </span>
          </button>
          {/* Option B: Stop auto-renewal */}
          <button
            onClick={() => setState("confirmingNoRenew")}
            className="flex-1 flex flex-col gap-1 rounded-xl border-2 border-[#2b4257]/30 bg-white px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-bold text-[#2b4257]">
              Turn off auto-renewal
            </span>
            <span className="text-xs text-[#2b4257]/70">
              {periodEndDate
                ? `Access continues until ${periodEndDate}. No refund.`
                : "Access continues until period end. No refund."}
            </span>
          </button>
        </div>
        <button
          onClick={() => setState("idle")}
          className="text-xs text-[#2b4257]/60 hover:text-[#2b4257] underline cursor-pointer bg-transparent border-0"
        >
          Go back
        </button>
      </div>
    );
  }

  if (state === "confirmingRefund") {
    return (
      <div className="flex flex-col items-center gap-2">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm font-semibold text-red-700 text-center">
          This cannot be undone. Your subscription ends immediately and your
          payment will be refunded.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => submit(true)}
            className="bg-red-600 text-white rounded-full px-6 py-3 text-sm font-semibold shadow-md hover:bg-red-700 transition-colors cursor-pointer border-0"
          >
            Yes, cancel and refund
          </button>
          <button
            onClick={() => setState("choosing")}
            className="bg-white text-[#2b4257] rounded-full px-6 py-3 text-sm font-semibold shadow-md hover:bg-gray-100 transition-colors cursor-pointer border border-[#2b4257]"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (state === "confirmingNoRenew") {
    return (
      <div className="flex flex-col items-center gap-2">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm text-[#2b4257] font-medium">Are you sure?</p>
        <div className="flex gap-2">
          <button
            onClick={() => submit(false)}
            className="bg-[#2b4257] text-white rounded-full px-16 py-3 text-sm font-semibold shadow-md hover:bg-[#1f2e3b] transition-colors cursor-pointer border-0"
          >
            Confirm cancel
          </button>
          <button
            onClick={() => setState(isEligibleForRefund ? "choosing" : "idle")}
            className="bg-white text-[#2b4257] rounded-full px-6 py-3 text-sm font-semibold shadow-md hover:bg-gray-100 transition-colors cursor-pointer border border-[#2b4257]"
          >
            Keep plan
          </button>
        </div>
      </div>
    );
  }

  // loading state
  return (
    <button
      disabled
      className="bg-[#2b4257] text-white rounded-full px-16 py-3 text-sm font-semibold shadow-md opacity-50 cursor-not-allowed border-0"
    >
      Cancelling...
    </button>
  );
}
