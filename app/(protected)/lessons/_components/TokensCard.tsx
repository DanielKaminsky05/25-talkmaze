"use client";

import { memo } from "react";

const TOKEN_EMOJIS = ["🧭", "🔭", "⭐️", "🏹", "🍍", "🗺️", "🐚", "🥥"];
const TOTAL_SLOTS = 11;

interface TokensCardProps {
  completedCount: number;
}

const TokensCard = memo(function TokensCard({ completedCount }: TokensCardProps) {
  const earned = Math.min(completedCount, TOKEN_EMOJIS.length);
  const locked = Math.max(0, TOTAL_SLOTS - earned);

  return (
    <div className="bg-[#B1E7D6] text-[#1f2e3b] rounded-lg p-6 flex flex-col justify-center shadow-lg h-[180px] w-full relative">
      <div className="font-bold text-sm mb-4">Tokens</div>
      <div className="flex flex-wrap gap-4 md:gap-8 text-3xl md:text-4xl">
        {TOKEN_EMOJIS.slice(0, earned).map((emoji, i) => (
          <span key={i}>{emoji}</span>
        ))}
        {Array.from({ length: locked }).map((_, i) => (
          <span key={`locked-${i}`} className="opacity-30">⭐️</span>
        ))}
      </div>
    </div>
  );
});

export default TokensCard;
