"use client";

import type { AdminPlan } from "../_types";

const CURRENCY_NORMALIZE: Record<string, string> = { CA: "CAD" };

function formatPrice(cents: number, currency: string) {
  const code =
    CURRENCY_NORMALIZE[currency.toUpperCase()] ?? currency.toUpperCase();
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function PlanListItem({
  plan,
  isSelected,
  onClick,
}: {
  plan: AdminPlan;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected
          ? "bg-[#B1E7D6]/10 border-l-[#B1E7D6]"
          : "border-l-transparent hover:bg-white/5"
      } ${!plan.is_active ? "opacity-50" : ""}`}
    >
      <div className="w-9 h-9 rounded-xl bg-[#B1E7D6]/15 flex items-center justify-center shrink-0">
        <span className="text-[#B1E7D6] text-sm font-bold">{plan.classes}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-medium truncate ${
              isSelected ? "text-[#B1E7D6]" : "text-white"
            }`}
          >
            {plan.name}
          </p>
          {!plan.is_active && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/40 bg-white/8 px-1.5 py-0.5 rounded">
              Archived
            </span>
          )}
        </div>
        <p className="text-white/35 text-xs truncate">
          {formatPrice(plan.cents, plan.currency)} · {plan.renewal}
        </p>
      </div>
    </button>
  );
}
