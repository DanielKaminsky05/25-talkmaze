"use client";

import { useState } from "react";
import type { TokenRow } from "../types";
import { TokenIcon } from "@/src/components/common/TokenIcon";
import { TokenMysteryStar } from "@/src/components/ui/icons";
import { Card } from "@/src/components/ui/card";

type Props = {
  courseTokens: TokenRow[];
  earnedTokenIds: Set<string>;
};

const COLS = 7;

export default function TokensRow({ courseTokens, earnedTokenIds }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visibleTokens = expanded ? courseTokens : courseTokens.slice(0, COLS);
  const hasMore = courseTokens.length > COLS;

  return (
    <Card
      variant="light"
      shadow="lg"
      padding="none"
      className="border-6 border-[#B1E7D6] rounded-xl px-3 py-2 w-full h-full"
    >
      <p className="text-[#2b4257] font-semibold text-xs mb-1">Tokens</p>
      <div className="grid grid-cols-7 gap-1">
        {visibleTokens.map((token) => {
          const earned = earnedTokenIds.has(token.id);
          return (
            <div
              key={token.id}
              className="relative group w-8 h-8 flex items-center justify-center text-2xl leading-none mx-auto"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2B4257] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {earned ? token.title : "???"}
              </div>
              {earned ? (
                <TokenIcon
                  iconUrl={token.icon_url}
                  title={token.title}
                  className="w-8 h-8 object-contain block text-xl"
                />
              ) : (
                <TokenMysteryStar size={24} />
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 w-full text-[11px] text-[#2b4257]/50 hover:text-[#2b4257] transition-colors text-center"
        >
          {expanded ? "Show less" : `Show all (${courseTokens.length})`}
        </button>
      )}
    </Card>
  );
}
