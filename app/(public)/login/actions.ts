"use server";

import { createClient } from "@/utils/supabase/server";

//Log in function
export const logInUser = async (email: string, password: string) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e) {
    console.error("There was a problem logging in: ", e);
    return { success: true, e };
  }
};
