"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubscriptionButton({ studentId }: { studentId?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCancel() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to cancel subscription");
        setConfirming(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to cancel subscription");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {confirming && !loading && (
        <p className="text-sm text-[#2b4257] font-medium">Are you sure?</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="bg-[#2b4257] text-[1rem] text-white rounded-full px-16 py-3 text-sm font-semibold shadow-md hover:bg-[#1f2e3b] transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Cancelling..." : confirming ? "Confirm cancel" : "Cancel plan"}
        </button>
        {confirming && !loading && (
          <button
            onClick={() => setConfirming(false)}
            className="bg-white text-[#2b4257] rounded-full px-6 py-3 text-sm font-semibold shadow-md hover:bg-gray-100 transition-colors cursor-pointer border border-[#2b4257]"
          >
            Keep plan
          </button>
        )}
      </div>
    </div>
  );
}
