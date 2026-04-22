"use server";
import { OnboardingTimeZone } from "./types";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { setProfileCookies } from "@/lib/profile-management/profile-cookies";
import { revalidatePath } from "next/cache";
export async function setActiveProfile(profileId: string, profileType: "student" | "parent") {
  return await setProfileCookies(profileId, profileType);
}

export async function handleStudentCreation(
  firstName: string,
  lastName: string,
  grade: number,
  additional_notes: string,
  time_zone: OnboardingTimeZone,
  weeklyAvailability: Record<string, { start: string; end: string }[]>,
) {
  const supabase = (await createClient()) as any;

  const auth = await supabase.auth.getUser();
  const account_id = auth?.data?.user?.id;

  if (!account_id) {
    return { success: false, error: "Account ID is missing" };
  }

  console.log("Inside handle student creation");

  
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

  const student_id = studentInsert.id;

  const availabilityRows = Object.entries(weeklyAvailability).flatMap(
    ([day, slots]) =>
      slots
        .filter((slot) => slot.start && slot.end)
        .map((slot) => ({
          student_id,
          weekday: dayMap[day],
          start_time: toTimestamp(slot.start),
          end_time: toTimestamp(slot.end),
        })),
  );

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

   const match = await findCoachMatch(supabase, student_id)

   if (!match) {
    return {
      status: 200,
      message: "Student created, but no coach available",
    };
  }

  const { error: sessionError } = await supabase
    .from("sessions")
    .insert({
      coach_id: match.coach_id,
      student_id,
      weekday: match.weekday,
      start_time: match.start_time,
      end_time: match.end_time,
    });

  if (sessionError) {
    console.error("SESSION INSERT ERROR:", sessionError);
    return {
      status: 500,
      message: "Failed to create session",
    };
  }

  revalidatePath("/profiles");
  return { success: true, status: 200, message: "Student created", student_id };
}

export async function updateStudentAvatar(studentId: string, avatarUrl: string) {
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
 
// ------------------ HELPERS ------------------
const toTimestamp = (time: string) => {
  return new Date(`1970-01-01T${time}:00Z`).toISOString();
};

const addOneHour = (iso: string) => {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
};

const dayMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// ------------------ MATCHING ------------------

async function findCoachMatch(
  supabase: any,
  student_id: string,
) {
  const { data: studentSlots } = await supabase
    .from("student_availabilities")
    .select("*")
    .eq("student_id", student_id);

  if (!studentSlots || studentSlots.length === 0) {
    return null;
  }

  console.log("Student Slots:", studentSlots);

  for (const slot of studentSlots) {
    let currentStart = slot.start_time;

    while (true) {
      const currentEnd = addOneHour(currentStart);

      if (currentEnd > slot.end_time) break;

      console.log("Checking slot:", currentStart, "→", currentEnd);

      const { data: coaches } = await supabase
        .from("coach_availabilities")
        .select("coach_id, weekday, start_time, end_time")
        .eq("weekday", slot.weekday)
        .lte("start_time", currentStart)
        .gte("end_time", currentEnd);

      console.log("Coaches found:", coaches);

      if (!coaches || coaches.length === 0) {
        currentStart = currentEnd;
        continue;
      }

      for (const coach of coaches) {
        const { data: existingSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("coach_id", coach.coach_id)
          .eq("weekday", slot.weekday)
          .lt("end_time", currentEnd)
          .gt("start_time", currentStart)
          .maybeSingle();

        if (!existingSession) {
          console.log("MATCH FOUND:", coach.coach_id);

          return {
            coach_id: coach.coach_id,
            weekday: slot.weekday,
            start_time: currentStart,
            end_time: currentEnd,
          };
        }
      }

      currentStart = currentEnd;
    }
  }

  return null;
}

export async function assignCoachToStudent(student_id: string) {
  const supabase = createServiceRoleClient();

  const match = await findCoachMatch(supabase, student_id);

  if (!match) {
    revalidatePath("/profiles");
    return { success: true, status: 200, message: "No coach available yet" };
  }

  const { error: sessionError } = await supabase
    .from("sessions")
    .insert({
      coach_id: match.coach_id,
      student_id,
      weekday: match.weekday,
      start_time: match.start_time,
      end_time: match.end_time,
    });

  if (sessionError) {
    console.error("SESSION INSERT ERROR:", sessionError);
    return { success: false, status: 500, error: "Failed to create session" };
  }

  revalidatePath("/profiles");
  return { success: true, status: 200, message: "Coach assigned", match };
}