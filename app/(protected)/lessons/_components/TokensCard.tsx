"use client";

import { memo } from "react";
import { LESSON_TOKENS } from "../_lib/tokens";

interface TokensCardProps {
  completedCount: number;
}

const TokensCard = memo(function TokensCard({ completedCount }: TokensCardProps) {
  return (
    <div className="bg-[#B1E7D6] rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-4 w-full">
      <p className="text-[#2b4257] font-semibold text-sm mb-3">Tokens</p>
      <div className="grid grid-cols-12 gap-3">
        {LESSON_TOKENS.map((emoji, i) => (
          <div
            key={i}
            className={`w-12 h-12 flex items-center justify-center text-3xl rounded-lg transition-all ${
              i < completedCount ? "" : "grayscale opacity-40"
            }`}
          >
            {i < completedCount ? emoji : "⭐"}
          </div>
        ))}
      </div>
    </div>
  );
});

export default TokensCard;
