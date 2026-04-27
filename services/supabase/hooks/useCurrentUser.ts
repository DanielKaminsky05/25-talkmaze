import { User } from "@supabase/supabase-js";
import { createClient } from "../client";
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
