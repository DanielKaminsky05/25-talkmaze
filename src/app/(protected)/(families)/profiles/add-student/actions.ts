"use server";

import { createClient } from "@/src/services/supabase/server";
import { redirect } from "next/navigation";

export async function addStudent(firstName: string, lastName: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      account_id: user.id,
      first_name: firstName,
      last_name: lastName,
      is_setup_complete: false,
    })
    .select("id")
    .single();

  if (error || !student) {
    console.error("Error creating student:", error);
    return { success: false, message: "Unable to create student. Please try again." };
  }

  redirect(`/payments?studentId=${student.id}`);
}
