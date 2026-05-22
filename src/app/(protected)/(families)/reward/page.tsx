"use client";

import { useState } from "react";
import { useRewardData, EarnedBadge } from "./_hooks/useRewardData";
import { TokenIcon } from "@/src/components/common/TokenIcon";
import { TokenMysteryStar } from "@/src/components/ui/icons";
import ClaimedBadge, { ClaimBadgeModal } from "./_components/ClaimedBadge";
import GlowingBadge from "./_components/GlowingBadge";
import LockedBadge from "./_components/LockedBadge";
import PageSpinner from "@/src/components/ui/PageSpinner";
import { createClient } from "@/src/services/supabase/client";

// Display this many tokens when tokens section is not expanded.
// One row on tablet/desktop; about two on mobile-sm.
const INITIAL_COUNT = 8;
// Keep badges grid visually stable; always rendering at least this many badges
const MIN_BADGE_SLOTS = 10;

const colors = {
  greenLight: "#B1E7D6",
  turquoise: "#2B4257",
  darkNavy: "#1F2E3B",
};

export default function RewardPage() {
  const {
    loading,
    allTokens,
    earnedTokenIds,
    earnedBadges,
    allBadges,
    studentId,
  } = useRewardData();

  const [expanded, setExpanded] = useState(false);
  const [claimingBadge, setClaimingBadge] = useState<EarnedBadge | null>(null);
  const [localBadges, setLocalBadges] = useState<EarnedBadge[] | null>(null);

  if (loading) return <PageSpinner />;

  // localBadges is an optimistic client update; so claims update instantly
  const badges = localBadges ?? earnedBadges;
  const earnedMap = new Map(badges.map((b) => [b.badge_id, b]));

  const sortedTokens = [...allTokens].sort((a, b) => {
    const aEarned = earnedTokenIds.has(a.id) ? 0 : 1;
    const bEarned = earnedTokenIds.has(b.id) ? 0 : 1;
    return aEarned - bEarned;
  });

  const visibleTokens = expanded
    ? sortedTokens
    : sortedTokens.slice(0, INITIAL_COUNT);

  // Null entries are intentional placeholders that render as locked slots.
  const badgeSlots = Array.from(
    { length: Math.max(MIN_BADGE_SLOTS, allBadges.length) },
    (_, index) => allBadges[index] ?? null,
  );

  // Bottom "Redeem" action opens the first earned badge that is still unclaimed.
  const firstClaimableBadge = allBadges.reduce<EarnedBadge | null>(
    (foundBadge, badge) => {
      if (foundBadge) return foundBadge;

      const earned = earnedMap.get(badge.id);
      return earned && !earned.claimed_at ? earned : null;
    },
    null,
  );

  // Persist claim and mirror it locally so the card transitions without refetching.
  async function handleClaim(badgeId: string) {
    if (!studentId) return;
    const supabase = createClient();
    await supabase
      .from("student_badges")
      .update({ claimed_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("badge_id", badgeId);
    setLocalBadges((prev) =>
      (prev ?? earnedBadges).map((b) =>
        b.badge_id === badgeId
          ? { ...b, claimed_at: new Date().toISOString() }
          : b,
      ),
    );
    setClaimingBadge(null);
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-4 md:p-8">
      <div className="relative max-w-7xl mx-auto flex flex-col gap-6">
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

          <div className="flex flex-wrap justify-center gap-4 px-2">
            {visibleTokens.map((token) => {
              const earned = earnedTokenIds.has(token.id);
              return (
                <div
                  key={token.id}
                  className="relative group flex flex-col items-center cursor-default"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2B4257] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {earned ? token.title : "???"}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-white/40 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md">
                    {earned ? (
                      <TokenIcon
                        iconUrl={token.icon_url}
                        title={token.title}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <TokenMysteryStar size={36} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand to see more tokens */}
          {allTokens.length > INITIAL_COUNT && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-5 w-full text-sm font-medium text-[#2B4257]/60 hover:text-[#2B4257] transition-colors text-center"
            >
              {expanded ? "Show less" : `Show all (${allTokens.length})`}
            </button>
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
            {badgeSlots.map((badge, index) => {
              if (!badge) return <LockedBadge key={`placeholder-${index}`} />;

              const earned = earnedMap.get(badge.id);
              if (!earned) return <LockedBadge key={badge.id} />;
              if (earned.claimed_at)
                return <ClaimedBadge key={badge.id} badge={earned} />;
              return (
                <GlowingBadge
                  key={badge.id}
                  badge={earned}
                  onClaim={() => setClaimingBadge(earned)}
                />
              );
            })}
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <button
              onClick={() => {
                if (firstClaimableBadge) {
                  setClaimingBadge(firstClaimableBadge);
                }
              }}
              disabled={!firstClaimableBadge}
              className="pointer-events-auto px-16 py-4 rounded-2xl shadow-xl transform transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
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

        {/* Modal popup to claim badges */}
        {claimingBadge && (
          <ClaimBadgeModal
            badge={claimingBadge}
            onClose={() => setClaimingBadge(null)}
            onRedeem={() => handleClaim(claimingBadge.badge_id)}
          />
        )}
      </div>
    </div>
  );
}
