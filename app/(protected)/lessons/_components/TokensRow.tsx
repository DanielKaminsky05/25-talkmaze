"use client";

import { memo } from "react";
import type { TokenRow } from "../types";
import { TokenIcon } from "../../components/TokenIcon";
import { TokenMysteryStar } from "../../components/TokenMysteryStar";

type Props = {
  courseTokens: TokenRow[];
  earnedTokenIds: Set<string>;
};

const TokensRow = memo(function TokensRow({
  courseTokens,
  earnedTokenIds,
}: Props) {
  return (
    <div className="border-[#B1E7D6] border-6 bg-white rounded-xl shadow-lg px-3 py-2 w-full h-full">
      <p className="text-[#2b4257] font-semibold text-xs mb-1">Tokens</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {courseTokens.map((token) => {
          const earned = earnedTokenIds.has(token.id);
          return (
            <div
              key={token.id}
              className="shrink-0 transition-all w-6 h-6 flex items-center justify-center text-2xl leading-none"
            >
              {earned ? (
                <TokenIcon
                  iconUrl={token.icon_url}
                  title={token.title}
                  className="w-6 h-6 object-contain block text-xl"
                />
              ) : (
                <TokenMysteryStar className="w-6 h-6 block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TokensRow;
