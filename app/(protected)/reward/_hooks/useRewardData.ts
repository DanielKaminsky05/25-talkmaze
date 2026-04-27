"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

type TokenRow = {
  id: string;
  title: string;
  icon_url: string | null;
  lesson_id: string | null;
};

export type EarnedBadge = {
  badge_id: string;
  awarded_at: string;
  claimed_at: string | null;
  badge: {
    id: string;
    title: string;
    image_url: string | null;
    course_id: string;
  };
};

export type BadgeRow = {
  id: string;
  title: string;
  image_url: string | null;
  course_id: string;
};

export function useRewardData() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allTokens, setAllTokens] = useState<TokenRow[]>([]);
  const [earnedTokenIds, setEarnedTokenIds] = useState(new Set<string>());
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeRow[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const profile = await getActiveProfile();

        // Rewards are student-only; redirect if another profile type is active.
        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        setStudentId(profile.id);

        // Pull all reward-related slices together to keep first paint fast.
        const [
          { data: tokensData },
          { data: earnedData },
          { data: badgesData },
          { data: allBadgesData },
        ] = await Promise.all([
          supabase.from("tokens").select("id, title, icon_url, lesson_id"),
          supabase
            .from("student_tokens")
            .select("token_id")
            .eq("student_id", profile.id),
          (supabase as any)
            .from("student_badges")
            .select(
              "badge_id, awarded_at, claimed_at, badge:badges(id, title, image_url, course_id)",
            )
            .eq("student_id", profile.id),
          supabase.from("badges").select("id, title, image_url, course_id"),
        ]);

        setAllTokens(tokensData ?? []);
        setEarnedTokenIds(
          new Set((earnedData ?? []).map((r: any) => r.token_id as string)),
        );
        setEarnedBadges(badgesData ?? []);
        setAllBadges(allBadgesData ?? []);
      } catch (err) {
        console.error("useRewardData error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    loading,
    allTokens,
    earnedTokenIds,
    earnedBadges,
    allBadges,
    studentId,
  };
}
