"use server";

import { createClient } from "@/src/services/supabase/server";

export const signUpNewUser = async (
  familyFirstName: string,
  familyLastName: string,
  studentFirstName: string,
  studentLastName: string,
  email: string,
  password: string,
): Promise<{ success: boolean; studentId?: string } | undefined> => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    console.error("Error signing up user:", error);
    return { success: false };
  }

  const { error: accountError } = await supabase.from("account").insert({
    id: data.user.id,
    email,
    role: 1,
    new: true,
  });

  if (accountError) {
    console.error("Error inserting account:", accountError);
    return { success: false };
  }

  const { error: parentsError } = await supabase.from("parents").insert({
    account_id: data.user.id,
    first_name: familyFirstName,
    last_name: familyLastName,
    billing_email: email,
    phone_number: null,
  });

  if (parentsError) {
    console.error("Error inserting parent:", parentsError);
    return { success: false };
  }

  const { data: studentData, error: studentsError } = await supabase
    .from("students")
    .insert({
      account_id: data.user.id,
      first_name: studentFirstName,
      last_name: studentLastName,
      is_setup_complete: false,
    })
    .select("id")
    .single();

  if (studentsError || !studentData) {
    console.error("Error inserting student:", studentsError);
    return { success: false };
  }

  return { success: true, studentId: studentData.id };
};
