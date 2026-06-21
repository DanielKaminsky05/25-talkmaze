"use server";

import { createClient } from "@/src/services/supabase/server";
import { cookies } from "next/headers";

export const logInUser = async (email: string, password: string) => {
  const cookieStore = await cookies();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      message: "Invalid login credentials",
    };
  }

  const id = data.user.id;

  cookieStore.set({
    name: "account_id",
    value: id,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return { success: true };
};
