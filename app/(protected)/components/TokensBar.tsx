"use client";

import { LESSON_TOKENS } from "../lessons/_lib/tokens";

interface TokenBarProps {
  completedCount: number;
}

export default function TokenBar({ completedCount }: TokenBarProps) {
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
        className="px-4 pt-3 pb-1"
        style={{
          color: "var(--talkmaze_turquoise, #2B4257)",
          fontSize: "16px",
          fontFamily: "Roboto, sans-serif",
          fontWeight: 600,
        }}
      >
        Tokens
      </div>

      <div className="grid grid-cols-8 gap-y-1 gap-x-0 px-3 pb-3">
        {LESSON_TOKENS.map((emoji, i) => (
          <span
            key={i}
            className={`text-xl text-center leading-tight transition-opacity ${i < completedCount ? "opacity-100" : "opacity-30"}`}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
