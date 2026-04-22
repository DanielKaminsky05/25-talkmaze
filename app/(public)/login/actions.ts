"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const logInUser = async (email: string, password: string) => {
  const cookieStore = await cookies();
  const supabase = await createClient();

  console.log("Inside Login")
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Handle login error FIRST
  if (error || !data.user) {

    console.log("Login error somehow");
    return {
      success: false,
      message: "Invalid login credentials",
    };
  }

  const id = data.user.id;

  console.log("Setting cookie");
  // Set cookie
  cookieStore.set({
    name: "account_id",
    value: id,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  // Redirect AFTER success
  redirect("/");
};
