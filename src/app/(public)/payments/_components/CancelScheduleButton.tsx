"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelScheduleButton({
  studentId,
}: {
  studentId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions/schedule/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to cancel plan change");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to cancel plan change");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="bg-[#2b4257] text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-md hover:bg-[#1f2e3b] transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Cancelling..." : "Cancel plan change"}
      </button>
    </div>
  );
}
