"use client";

import { memo } from "react";

const TOKEN_EMOJIS = ["🧭", "🔭", "⭐️", "🏹", "🍍", "🗺️", "🐚", "🥥"];
const TOTAL_SLOTS = 11;
const GAP_PX = 8;
const TOKEN_SIZE_PX = 36;

type Props = {
  completedCount: number;
};

const BadgesCard = memo(function BadgesCard({ completedCount }: Props) {
  const earned = Math.min(completedCount, TOKEN_EMOJIS.length);
  const locked = Math.max(0, TOTAL_SLOTS - earned);

  return (
    <div className="border-4 border-[#B1E7d6] bg-white text-[#1f2e3b] rounded-lg p-4 h-[100px] flex flex-col shadow-lg relative overflow-hidden">
      <div className="font-bold text-xs mb-1 z-10">Tokens</div>

      <div
        className="flex items-center z-10 mt-1 flex-1 min-h-0 w-full justify-start overflow-x-auto overflow-y-hidden pb-1"
        style={{ gap: GAP_PX }}
      >
        {TOKEN_EMOJIS.slice(0, earned).map((emoji, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-lg bg-gray-100 shrink-0 grow-0 text-lg"
            style={{ width: TOKEN_SIZE_PX, height: TOKEN_SIZE_PX }}
          >
            {emoji}
          </span>
        ))}
        {Array.from({ length: locked }).map((_, i) => (
          <span
            key={`locked-${i}`}
            className="inline-flex items-center justify-center rounded-lg bg-gray-100 shrink-0 grow-0 text-lg grayscale opacity-45"
            style={{ width: TOKEN_SIZE_PX, height: TOKEN_SIZE_PX }}
          >
            ⭐️
          </span>
        ))}
      </div>

      <div className="absolute -right-4 -bottom-4 opacity-10 text-6xl pointer-events-none">
        🧭
      </div>
    </div>
  );
});

export default BadgesCard;
