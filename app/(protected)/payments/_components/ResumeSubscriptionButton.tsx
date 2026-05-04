"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResumeSubscriptionButton({
  studentId,
}: {
  studentId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleResume() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to resume subscription");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to resume subscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleResume}
        disabled={loading}
        className="bg-[#65cfad] text-[#1f2e3b] rounded-full px-8 py-3 text-sm font-semibold shadow-md hover:bg-[#4db89a] transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Resuming..." : "Resume auto-renewal"}
      </button>
    </div>
  );
}
