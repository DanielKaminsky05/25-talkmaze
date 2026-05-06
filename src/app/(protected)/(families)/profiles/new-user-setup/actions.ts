"use server";

import { createClient } from "@/src/services/supabase/server";
import { redirect } from "next/navigation";

export async function completeNewUserSetup(pin: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { error: pinError } = await supabase
    .from("parents")
    .update({ profile_access_pin: pin })
    .eq("account_id", user.id);

  if (pinError) {
    console.error("Error setting PIN:", pinError);
    return { success: false, message: "Unable to save PIN. Please try again." };
  }

  const { error: accountError } = await supabase
    .from("account")
    .update({ new: false })
    .eq("id", user.id);

  if (accountError) {
    console.error("Error updating account:", accountError);
    return { success: false, message: "Unable to complete setup. Please try again." };
  }

  redirect("/profiles");
}
