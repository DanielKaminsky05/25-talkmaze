"use client";

import { memo } from "react";
import { LESSON_TOKENS } from "../_lib/tokens";

type Props = {
  completedCount: number;
};

const BadgesCard = memo(function BadgesCard({ completedCount }: Props) {
  return (
    <div className="bg-[#B1E7D6] rounded-xl shadow-lg px-3 py-2 w-full">
      <p className="text-[#2b4257] font-semibold text-xs mb-1">Tokens</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {LESSON_TOKENS.map((emoji, i) => (
          <span
            key={i}
            className={`text-2xl shrink-0 transition-all ${
              i < completedCount ? "" : "grayscale opacity-40"
            }`}
          >
            {i < completedCount ? emoji : "⭐"}
          </span>
        ))}
      </div>
    </div>
  );
});

export default BadgesCard;
