"use client";

import { useState } from "react";
import { useRewardData } from "./_hooks/useRewardData";
import { TokenIcon } from "../components/TokenIcon";
import { TokenMysteryStar } from "../components/TokenMysteryStar";
import PageSpinner from "../components/PageSpinner";

const INITIAL_COUNT = 16;

const BadgeCard = ({ imageSrc }: { imageSrc: string }) => (
  <div className="relative group">
    <div className="rounded-xl overflow-hidden bg-white/20 p-2 shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-white/40 hover:-translate-y-1">
      <img
        src={imageSrc}
        alt="Explorer Badge"
        className="w-full h-auto object-contain rounded-lg aspect-square"
      />
    </div>
  </div>
);

export default function RewardPage() {
  const { loading, allTokens, earnedTokenIds } = useRewardData();
  const [expanded, setExpanded] = useState(false);

  const colors = {
    greenLight: "#B1E7D6",
    turquoise: "#2B4257",
    darkNavy: "#1F2E3B",
  };

  if (loading) return <PageSpinner />;

  const sortedTokens = [...allTokens].sort((a, b) => {
    const aEarned = earnedTokenIds.has(a.id) ? 0 : 1;
    const bEarned = earnedTokenIds.has(b.id) ? 0 : 1;
    return aEarned - bEarned;
  });
  const visibleTokens = expanded
    ? sortedTokens
    : sortedTokens.slice(0, INITIAL_COUNT);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* TOKENS SECTION */}
        <section
          className="w-full relative rounded-2xl p-6 shadow-md border-4"
          style={{
            backgroundColor: colors.greenLight,
            borderColor: colors.greenLight,
          }}
        >
          <h2
            className="text-lg font-bold mb-6"
            style={{ color: colors.turquoise }}
          >
            Tokens
          </h2>

          {allTokens.length === 0 ? (
            <p className="text-sm text-[#2B4257]/50 italic px-2">
              No tokens available yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 px-2">
                {visibleTokens.map((token) => {
                  const earned = earnedTokenIds.has(token.id);
                  return (
                    <div
                      key={token.id}
                      className="relative group flex flex-col items-center cursor-default"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2B4257] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {earned ? token.title : "???"}
                      </div>
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl bg-white/40 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md">
                        {earned ? (
                          <TokenIcon
                            iconUrl={token.icon_url}
                            title={token.title}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <TokenMysteryStar className="w-9 h-9 block" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allTokens.length > INITIAL_COUNT && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-5 w-full text-sm font-medium text-[#2B4257]/60 hover:text-[#2B4257] transition-colors text-center"
                >
                  {expanded ? "Show less" : `Show all (${allTokens.length})`}
                </button>
              )}
            </>
          )}
        </section>

        {/* BADGES SECTION */}
        <section
          className="w-full flex-1 min-h-[500px] rounded-2xl p-6 shadow-md relative flex flex-col"
          style={{ backgroundColor: colors.greenLight }}
        >
          <h2
            className="text-lg font-bold mb-6"
            style={{ color: colors.turquoise }}
          >
            Badges
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-24">
            {Array.from({ length: 10 }).map((_, i) => (
              <BadgeCard
                key={i}
                imageSrc={`https://placehold.co/175x175/${
                  ["5A50CD", "2BA52E", "185476", "D55B40", "604C3D"][i % 5]
                }/FFFFFF?text=EXPLORER`}
              />
            ))}
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <button
              className="pointer-events-auto px-16 py-4 rounded-2xl shadow-xl transform transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: colors.darkNavy }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: colors.greenLight }}
              >
                Redeem
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
