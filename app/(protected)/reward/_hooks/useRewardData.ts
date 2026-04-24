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

export function useRewardData() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allTokens, setAllTokens] = useState<TokenRow[]>([]);
  const [earnedTokenIds, setEarnedTokenIds] = useState(new Set<string>());

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const profile = await getActiveProfile();

        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        const [{ data: tokensData }, { data: earnedData }] = await Promise.all([
          supabase.from("tokens").select("id, title, icon_url, lesson_id"),
          supabase
            .from("student_tokens")
            .select("token_id")
            .eq("student_id", profile.id),
        ]);

        setAllTokens(tokensData ?? []);
        setEarnedTokenIds(
          new Set((earnedData ?? []).map((r: any) => r.token_id as string)),
        );
      } catch (err) {
        console.error("useRewardData error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { loading, allTokens, earnedTokenIds };
}
