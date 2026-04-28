"use client";

import { memo } from "react";
import type { TokenRow } from "../types";
import { TokenIcon } from "../../components/TokenIcon";
import { TokenMysteryStar } from "../../components/TokenMysteryStar";

interface TokensCardProps {
  courseTokens: TokenRow[];
  earnedTokenIds: Set<string>;
}

const TokensCard = memo(function TokensCard({ courseTokens, earnedTokenIds }: TokensCardProps) {
  return (
    <div className="bg-[#B1E7D6] rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] py-4 px-8 w-full">
      <p className="text-[#2b4257] font-semibold text-sm mb-3">Tokens</p>
      <div className="grid grid-cols-12 gap-3">
        {courseTokens.map((token) => {
          const earned = earnedTokenIds.has(token.id);
          return (
            <div
              key={token.id}
              className="relative group flex items-center justify-center cursor-default"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2B4257] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {earned ? token.title : "???"}
              </div>
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-xl bg-white/40 shadow-sm transition-all duration-200 ${
                  earned ? "hover:scale-110 hover:shadow-md" : "grayscale opacity-40"
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center leading-none">
                  {earned ? (
                    <TokenIcon
                      iconUrl={token.icon_url}
                      title={token.title}
                      className="w-8 h-8 object-contain block text-3xl"
                    />
                  ) : (
                    <TokenMysteryStar className="w-8 h-8 block" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TokensCard;
