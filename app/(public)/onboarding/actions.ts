"use server";
import { OnboardingTimeZone } from "./types";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { setProfileCookies } from "@/lib/profile-management/profile-cookies";
import { revalidatePath } from "next/cache";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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
          start_time_new: `${slot.start}:00`,
          end_time_new: `${slot.end}:00`,
          timezone: time_zone,
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

  revalidatePath("/profiles");
  // We no longer match or create a session here. That happens purely at checkout via Stripe!
  return { success: true, status: 200, message: "Student created successfully", student_id };
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

const dayMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// ------------------ BULK SESSION GENERATION ------------------

export async function assignCoachToStudent(student_id: string, num_classes: number) {
  console.log(`Starting bulk booking for student ${student_id} for ${num_classes} classes.`);
  const supabase = createServiceRoleClient();

  // 1. Fetch student availability
  const { data: studentSlots } = await supabase
    .from("student_availabilities")
    .select("*")
    .eq("student_id", student_id);

  if (!studentSlots || studentSlots.length === 0) {
    return { success: false, status: 400, message: "Student has no availability configured" };
  }

  const generatedSessions: any[] = [];
  let matchedCoachId: string | null = null;
  
  // Start searching dates from tomorrow
  let searchStartDate = dayjs.utc().add(1, 'day');
  let maxSearchDays = 14; 
  
  let anchorFound = false;
  let matchingSlot: any = null;
  let finalStartTimeUTC: dayjs.Dayjs | null = null;

  // Outer loop: Try to find a single valid concrete timeslot (anchor date) 
  for (let i = 0; i < maxSearchDays && !anchorFound; i++) {
    const testDate = searchStartDate.add(i, 'day');
    const dayOfWeek = testDate.day(); // 0 goes to Sunday

    for (const slot of studentSlots) {
      if (slot.weekday === dayOfWeek && slot.timezone && slot.start_time_new && slot.end_time_new) {
        
        // Construct the concrete moment in the student's local timezone
        const dateString = testDate.format('YYYY-MM-DD');
        const startLocal = dayjs.tz(`${dateString}T${slot.start_time_new}`, slot.timezone);
        // We will default to 1-hour sessions 
        const endLocal = startLocal.add(1, 'hour'); 
        
        const startUTC = startLocal.utc();
        const endUTC = endLocal.utc();

        // Find ALL candidate coaches (we will filter timezone constraints in JS)
        const { data: coaches } = await supabase
          .from("coach_availabilities")
          .select("coach_id, weekday, start_time_new, end_time_new, timezone");

        if (!coaches || coaches.length === 0) continue;

        // Loop through candidate coaches and verify there are no discrete calendar collisions
        for (const coach of coaches) {
           if (!coach.timezone || !coach.start_time_new || !coach.end_time_new) continue;

           // Calculate exactly what time this UTC class will happen in the coach's living room
           const coachTargetStart = startUTC.tz(coach.timezone);
           const coachTargetEnd = endUTC.tz(coach.timezone);

           // 1. Is the class on the correct coach's weekday?
           if (coachTargetStart.day() !== coach.weekday) continue;

           // 2. Is the class within the coach's start and end times?
           const coachLocalStartTimeStr = coachTargetStart.format('HH:mm:ss');
           const coachLocalEndTimeStr = coachTargetEnd.format('HH:mm:ss');

           if (coachLocalStartTimeStr < coach.start_time_new || coachLocalEndTimeStr > coach.end_time_new) {
               continue; // The target class falls outside the coach's working hours
           }

           // 3. Calendar collision check (nobody is double booked precisely on this day)
           const { data: coachCollision } = await supabase
            .from("sessions")
            .select("id")
            .eq("coach_id", coach.coach_id)
            .lt("start_time", endUTC.toISOString())
            .gt("end_time", startUTC.toISOString())
            .maybeSingle();
            
           if (!coachCollision) {
              // Now ensure the student is also safe/free
              const { data: studentCollision } = await supabase
                .from("sessions")
                .select("id")
                .eq("student_id", student_id)
                .lt("start_time", endUTC.toISOString())
                .gt("end_time", startUTC.toISOString())
                .maybeSingle();
                
              if (!studentCollision) {
                  matchedCoachId = coach.coach_id;
                  matchingSlot = slot;
                  finalStartTimeUTC = startUTC;
                  anchorFound = true;
                  break;
              }
           }
        }
        if (anchorFound) break;
      }
    }
  }

  if (!anchorFound || !matchedCoachId || !finalStartTimeUTC || !matchingSlot) {
     console.log(`No available coach found for student ${student_id}`);
     // Returning 200 safely allows the Stripe webhook to finish without crashing, but an admin alert should be sent.
     return { success: false, status: 200, message: "No coach available for requested times" };
  }

  console.log(`MATCH FOUND! Anchor UTC start is ${finalStartTimeUTC.toISOString()} with coach ${matchedCoachId}`);

  // 2. Extrapolate `num_classes` instances matching the safe anchor!
  let successfullyBooked = 0;
  let weekOffset = 0;
  
  while (successfullyBooked < num_classes) {
     
     // This inherently handles Daylight Saving Time crossings perfectly!
     const loopStart = finalStartTimeUTC.tz(matchingSlot.timezone).add(weekOffset, 'week');
     const loopEnd = loopStart.add(1, 'hour'); 

     const loopStartUTC = loopStart.utc().toISOString();
     const loopEndUTC = loopEnd.utc().toISOString();
     
     // Quick final check against the real database calendar to guarantee no future overlaps
     const { data: collision } = await supabase
        .from("sessions")
        .select("id")
        .eq("coach_id", matchedCoachId)
        .lt("start_time", loopEndUTC)
        .gt("end_time", loopStartUTC)
        .maybeSingle();

     if (!collision) {
         generatedSessions.push({
            coach_id: matchedCoachId,
            student_id: student_id,
            weekday: matchingSlot.weekday,
            start_time: loopStartUTC,
            end_time: loopEndUTC
         });
         successfullyBooked++;
     }
     
     weekOffset++;
     // Hard limit failsafe so it doesn't loop forever if their calendar block is entirely clogged
     if (weekOffset > num_classes * 3) {
        console.warn("Exceeded safe loop boundary skipping filled weeks.");
        break; 
     }
  }

  // 3. Bulk Insert
  if (generatedSessions.length > 0) {
     const { error: sessionError } = await supabase
        .from("sessions")
        .insert(generatedSessions);
        
     if (sessionError) {
        console.error("SESSION BULK INSERT ERROR:", sessionError);
        return { success: false, status: 500, error: "Failed to bulk create sessions" };
     }
  }

  revalidatePath("/profiles");
  return { success: true, status: 200, message: `Successfully scheduled ${generatedSessions.length} classes!` };
}