"use client";

import { TokenIcon } from "./TokenIcon";
import { TokenMysteryStar } from "./TokenMysteryStar";

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

export default function TokenBar({
  courseTokens,
  earnedTokenIds,
}: TokenBarProps) {
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
        className="px-4 pt-3"
        style={{
          color: "var(--talkmaze_turquoise, #2B4257)",
          fontSize: "16px",
          fontFamily: "Roboto, sans-serif",
          fontWeight: 600,
        }}
      >
        Tokens
      </div>

      <div className="grid grid-cols-8 gap-y-1 gap-x-2 px-3 pb-3">
        {courseTokens.map((token) => (
          <div
            key={token.id}
            className="mx-auto w-5 h-5 flex items-center justify-center text-xl leading-none text-center transition-opacity"
          >
            {earnedTokenIds.has(token.id) ? (
              <TokenIcon
                iconUrl={token.icon_url}
                title={token.title}
                className="w-5 h-5 object-contain block text-base"
              />
            ) : (
              <TokenMysteryStar className="w-5 h-5 block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
