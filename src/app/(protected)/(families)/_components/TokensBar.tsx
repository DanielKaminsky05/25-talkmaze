"use client";

import { useState } from "react";
import { TokenIcon } from "@/src/components/common/TokenIcon";

type TokenRow = {
  id: string;
  title: string;
  icon_url: string | null;
  lesson_id: string | null;
};

interface TokenBarProps {
  courseTokens: TokenRow[];
  earnedTokenIds: Set<string>;
}

const INITIAL_COUNT = 16; // 2 rows × 8 cols

/**
 * Component displaying earned tokens
 */
export default function TokenBar({
  courseTokens,
  earnedTokenIds,
}: TokenBarProps) {
  const [expanded, setExpanded] = useState(false);

  const earnedTokens = courseTokens.filter((t) => earnedTokenIds.has(t.id));
  const visibleTokens = expanded
    ? earnedTokens
    : earnedTokens.slice(0, INITIAL_COUNT);
  const hiddenCount = earnedTokens.length - INITIAL_COUNT;

  return (
    <div
      className="relative bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] box-border"
      style={{
        width: "402px",
        flexShrink: 0,
        outline: "7px solid var(--talkmaze_green_light, #B1E7D6)",
        outlineOffset: "-7px",
      }}
    >
      <div
        className="px-4 pt-3 "
        style={{
          color: "var(--talkmaze_turquoise, #2B4257)",
          fontSize: "16px",
          fontFamily: "Roboto, sans-serif",
          fontWeight: 600,
        }}
      >
        Tokens
      </div>

      {earnedTokens.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-[#2B4257]/50 italic">
          No tokens earned yet
        </p>
      ) : (
        <>
          <div className="grid grid-cols-8 gap-y-1 gap-x-2 px-3 pb-5">
            {visibleTokens.map((token) => (
              <div
                key={token.id}
                className="relative group mx-auto w-8 h-8 flex items-center justify-center text-xl leading-none"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2B4257] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {token.title}
                </div>
                <TokenIcon
                  iconUrl={token.icon_url}
                  title={token.title}
                  className="w-8 h-8 object-contain block text-base"
                />
              </div>
            ))}
          </div>

          {/* Expand to show more earned tokens */}
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full pb-3 text-[11px] text-[#2B4257]/50 hover:text-[#2B4257] transition-colors text-center"
            >
              +{hiddenCount} more
            </button>
          )}
          {expanded && earnedTokens.length > INITIAL_COUNT && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full pb-3 text-[11px] text-[#2B4257]/50 hover:text-[#2B4257] transition-colors text-center"
            >
              Show less
            </button>
          )}
        </>
      )}
    </div>
  );
}
