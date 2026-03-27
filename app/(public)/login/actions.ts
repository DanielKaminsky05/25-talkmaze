"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
//Log in function
export const logInUser = async (email: string, password: string) => {
  const cookieStore = await cookies();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    const id = data.user?.id;

    if(id != null){
      cookieStore.set({
        name: "account_id",
        value: id,
        httpOnly: true,
        path:'/',
        sameSite: 'lax'
      })
    }else{
      redirect("/login");
    }
    
    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (e) {
    console.error("There was a problem logging in: ", e);
    return { success: true, e };
  }
};
