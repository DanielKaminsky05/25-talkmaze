"use server";
import { OnboardingTimeZone } from "./types";
import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { setProfileCookies } from "@/src/lib/profiles/server/profileCookies";
import { buildAvailabilityRows } from "@/src/lib/scheduling/server/availability";
import { revalidatePath } from "next/cache";

export async function setActiveProfile(
  profileId: string,
  profileType: "student" | "parent",
) {
  return await setProfileCookies(profileId, profileType);
}

//function to check current status of student onboarding

export async function getStudentOnboardingProgress() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      message: "Can't identify account",
    };
  }

  const { data: isNew, error: isNewError } = await supabase
    .from("account")
    .select("new")
    .eq("id", user.id)
    .single();

  if (!isNew || isNewError) {
    return {
      success: false,
      message: "Can't find account onboarding status",
    };
  }

  //if new account created from onboarding, need to retrieve existing data of the student
  if (isNew?.new === true) {
    const { data: studentData, error: studentDataError } = await supabase
      .from("students")
      .select("*")
      .eq("account_id", user.id)
      .single();

    //make sure student actually exists
    if (studentDataError || !studentData) {
      return {
        success: false,
        message: "Unable to find student belonging to account",
      };
    }

    return studentData;
  }

  return null;
}

export async function handleUpdateStudent(notes: string, grade: number) {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  //  update student row
  const { data, error } = await supabase
    .from("students")
    .update({
      notes: notes,
      grade: JSON.stringify(grade),
    })
    .eq("id", user.id) // ⚠️ change if your FK is different
    .select()
    .single();

  if (error) {
    console.error("Update error:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    student: data,
  };
}
export async function handleStudentCreation(
  firstName: string,
  lastName: string,
  grade: number,
  additional_notes: string,
  time_zone: OnboardingTimeZone,
  weeklyAvailability: Record<string, { start: string; end: string }[]>,
  isFirst: boolean,
) {
  const supabase = (await createClient()) as any;

  const account_id = (await getCurrentUser())?.id;

  if (!account_id) {
    return { success: false, error: "Account ID is missing" };
  }

  console.log("Inside handle student creation");

  let student_id = "";
  if (isFirst) {
    const { data: studentUpdate, error: studentUpdateError } = await supabase
      .from("students")
      .update({
        account_id: account_id,
        first_name: firstName,
        last_name: lastName,
        grade: String(grade),
        notes: additional_notes,
      })
      .eq("account_id", account_id)
      .select()
      .single();

    if (!studentUpdate || studentUpdateError) {
      console.error("Student info update error:", studentUpdateError);
      return { status: 500, message: "Error updating student for new account" };
    }

    student_id = studentUpdate.id;
  } else {
    const { data: studentInsert, error: studentError } = await supabase
      .from("students")
      .insert({
        account_id: account_id,
        first_name: firstName,
        last_name: lastName,
        grade: String(grade),
        notes: additional_notes,
      })
      .select()
      .single();

    if (studentError || !studentInsert) {
      console.error("Student insert error:", studentError);
      return { status: 500, message: "Error inserting student" };
    }

    student_id = studentInsert.id;
  }

  const availabilityRows = buildAvailabilityRows({
    studentId: student_id,
    weeklyAvailability,
    timeZone: time_zone,
  });

  console.log("weeklyAvailability:", weeklyAvailability);
  console.log("availabilityRows:", availabilityRows);

  if (availabilityRows.length > 0) {
    const { error: availabilityError } = await supabase
      .from("student_availabilities")
      .insert(availabilityRows);

    if (availabilityError) {
      console.error("Availability insert error:", availabilityError);
      return {
        status: 500,
        message: "Error inserting availability",
      };
    }
  }

  //after everything, indicate that onboarding for the account is done by setting the new col to false

  const { data: updateNew, error: updateNewError } = await supabase
    .from("account")
    .update({ new: false })
    .eq("id", account_id)
    .select()
    .single();

  await supabase
    .from("students")
    .update({ is_setup_complete: true })
    .eq("id", student_id);

  revalidatePath("/profiles");
  // We no longer match or create a session here. That happens purely at checkout via Stripe!
  return {
    success: true,
    status: 200,
    message: "Student created successfully",
    student_id,
  };
}

export async function updateStudentAvatar(
  studentId: string,
  avatarUrl: string,
) {
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("students")
    .update({ avatar_url: avatarUrl })
    .eq("id", studentId);

  if (error) {
    console.error("Error updating student avatar:", error);
    return { success: false, error: "Failed to update avatar" };
  }

  revalidatePath("/profiles");
  return { success: true };
}
