"use server";
import { OnboardingTimeZone } from "./types";
import { createClient } from "@/services/supabase/server";
import { createServiceRoleClient } from "@/services/supabase/service";
import type { TablesInsert } from "@/services/supabase/types/database";
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

//function to check current status of student onboarding

export async function getStudentOnboardingProgress() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Can't identify account"
    }
  }

  const { data: isNew, error: isNewError } = await supabase.from('account').select('new').eq('id', user.id);

  if (!isNew || isNewError) {
    return {
      success: false,
      message: "Can't find account onboarding status"
    }
  }

  //if new account created from onboarding, need to retrieve existing data of the student
  if (isNew) {
    const { data: studentData, error: studentDataError } = await supabase.from('students').select('*').eq('account_id', user.id).single();

    //make sure student actually exists 
    if (studentDataError || !studentData) {
      return {
        success: false,
        message: "Unable to find student belonging to account"
      }
    }

    return studentData;
  }

  return null;
}

export async function handleUpdateStudent(notes: string, grade: number) {
  const supabase = await createClient();

  //get logged in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
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
      grade: JSON.stringify(grade)
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
  isFirst: boolean
) {
  const supabase = (await createClient()) as any;

  const auth = await supabase.auth.getUser();
  const account_id = auth?.data?.user?.id;

  if (!account_id) {
    return { success: false, error: "Account ID is missing" };
  }

  console.log("Inside handle student creation");

  let student_id = "";
  if (isFirst) {
    const { data: studentUpdate, error: studentUpdateError} = await supabase
      .from('students')
      .update({
        account_id: account_id,
        first_name: firstName,
        last_name: lastName,
        grade: String(grade),
        notes: additional_notes
      }).eq('account_id', account_id).select().single();

      if(!studentUpdate || studentUpdateError){
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

  //after everything, indicate that onboarding for the account is done by setting the new col to false

  const {data: updateNew, error: updateNewError} = await supabase
    .from('account')
    .update({new: false})
    .eq('id', account_id )
    .select()
    .single();


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

  let matchedCoachId: string | null = null;

  // Start searching dates from tomorrow
  const searchStartDate = dayjs.utc().add(1, 'day');

  let anchorFound = false;
  let matchingSlot: any = null;
  let finalStartTimeUTC: dayjs.Dayjs | null = null;

  // Shuffle the student's requested slots to evenly load balance which day of the week they get
  const shuffledStudentSlots = studentSlots.sort(() => 0.5 - Math.random());

  console.log(`[MATCHMAKER] Student requested ${studentSlots.length} available slots.`);

  // Pre-fetch all active booked slots for the student to check for permanent collisions
  const { data: studentBookedSlots } = await supabase
    .from("booked_slots")
    .select("*")
    .eq("student_id", student_id)
    .eq("status", "active");

  // Pre-fetch ALL candidate coaches once
  const { data: coaches } = await supabase
    .from("coach_availabilities")
    .select("coach_id, weekday, start_time_new, end_time_new, timezone");

  // Outer loop: Try to find a single valid concrete timeslot (anchor date) based on their random slot order
  for (const slot of shuffledStudentSlots) {
    if (!slot.timezone || !slot.start_time_new || !slot.end_time_new) continue;

    console.log(`[MATCHMAKER] Evaluating Student Slot: Weekday ${slot.weekday} at ${slot.start_time_new} (${slot.timezone})`);

    // Find the next calendar date that matches this slot's weekday, starting from tomorrow
    let testDate = searchStartDate;
    while (testDate.day() !== slot.weekday) {
      testDate = testDate.add(1, 'day');
    }

    // Construct the concrete moment in the student's local timezone
    const dateString = testDate.format('YYYY-MM-DD');
    const blockStartLocal = dayjs.tz(`${dateString}T${slot.start_time_new}`, slot.timezone);
    const blockEndLocal = dayjs.tz(`${dateString}T${slot.end_time_new}`, slot.timezone);

    // Generate potential 1-hour start times within this block, stepped by 10 minutes
    const potentialStarts: dayjs.Dayjs[] = [];
    let currentStart = blockStartLocal;

    // Ensure we start on a 10-minute boundary to avoid random times
    const minutes = currentStart.minute();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      currentStart = currentStart.add(10 - remainder, 'minute');
    }

    // A session is 1 hour long. So the latest start time is blockEnd - 1 hour.
    while (currentStart.add(1, 'hour').valueOf() <= blockEndLocal.valueOf()) {
      potentialStarts.push(currentStart);
      currentStart = currentStart.add(10, 'minute');
    }

    if (potentialStarts.length === 0) {
      console.log(`[MATCHMAKER] Slot too short for a 1-hour session: ${slot.start_time_new} to ${slot.end_time_new}`);
      continue;
    }

    let localAnchorFound = false;

    // Now try each potential 1-hour block within this availability window
    for (const startLocal of potentialStarts) {
      const endLocal = startLocal.add(1, 'hour');
      const startUTC = startLocal.utc();
      const endUTC = endLocal.utc();

      console.log(`[MATCHMAKER] Testing Potential Anchor: ${startUTC.toISOString()} (UTC)`);

      // Check if this concrete moment conflicts with the student's OWN active booked slots
      let studentHasPermanentConflict = false;
      if (studentBookedSlots) {
        for (const bs of studentBookedSlots) {
          if (!bs.timezone || !bs.start_time || !bs.end_time) continue;
          const bsDateLocal = startUTC.tz(bs.timezone).day(bs.weekday);
          const bsStartLocal = dayjs.tz(`${bsDateLocal.format('YYYY-MM-DD')}T${bs.start_time}`, bs.timezone);
          const bsEndLocal = dayjs.tz(`${bsDateLocal.format('YYYY-MM-DD')}T${bs.end_time}`, bs.timezone);

          if (startUTC.isBefore(bsEndLocal.utc()) && endUTC.isAfter(bsStartLocal.utc())) {
            studentHasPermanentConflict = true;
            break;
          }
        }
      }
      if (studentHasPermanentConflict) {
        console.log(`[MATCHMAKER] Student already has a permanent booked slot at this time.`);
        continue;
      }

      if (!coaches || coaches.length === 0) {
        console.log(`[MATCHMAKER] ❌ No active coach availabilities found in the DB.`);
        break; // no coaches at all
      }

      // Shuffle the array to ensure round-robin assignment instead of first-come-first-serve
      const shuffledCoaches = coaches.sort(() => 0.5 - Math.random());

      // Loop through candidate coaches and verify there are no discrete calendar collisions
      for (const coach of shuffledCoaches) {
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
          continue;
        }

        console.log(`[MATCHMAKER] 🕒 Coach ${coach.coach_id} is awake and working during this time! Checking calendar collisions...`);

        // 3. Calendar collision check
        // First, check for permanent schedule collisions in booked_slots
        const { data: coachBookedSlots } = await supabase
          .from("booked_slots")
          .select("*")
          .eq("coach_id", coach.coach_id)
          .eq("status", "active");

        let coachHasPermanentConflict = false;
        if (coachBookedSlots) {
          for (const bs of coachBookedSlots) {
            if (!bs.timezone || !bs.start_time || !bs.end_time) continue;
            const bsDateLocal = startUTC.tz(bs.timezone).day(bs.weekday);
            const bsStartLocal = dayjs.tz(`${bsDateLocal.format('YYYY-MM-DD')}T${bs.start_time}`, bs.timezone);
            const bsEndLocal = dayjs.tz(`${bsDateLocal.format('YYYY-MM-DD')}T${bs.end_time}`, bs.timezone);

            if (startUTC.isBefore(bsEndLocal.utc()) && endUTC.isAfter(bsStartLocal.utc())) {
              coachHasPermanentConflict = true;
              break;
            }
          }
        }

        if (coachHasPermanentConflict) {
          console.log(`[MATCHMAKER] ❌ Collision: Coach ${coach.coach_id} has a permanent booked slot at this time!`);
          continue;
        }

        // We still check for concrete session collisions just in case they have a one-off manually scheduled class here
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
            console.log(`[MATCHMAKER] ✅ PERFECT MATCH! Coach ${coach.coach_id} assigned.`);
            matchedCoachId = coach.coach_id;

            // Re-assign the matchingSlot with the precise 10-minute offset we discovered!
            matchingSlot = {
              ...slot,
              start_time_new: startLocal.format('HH:mm:ss'),
              end_time_new: endLocal.format('HH:mm:ss')
            };

            finalStartTimeUTC = startUTC;
            localAnchorFound = true;
            break;
          } else {
            console.log(`[MATCHMAKER] ❌ Collision: Student is already booked at this time!`);
          }
        } else {
          console.log(`[MATCHMAKER] ❌ Collision: Coach ${coach.coach_id} is already booked at this time!`);
        }
      }

      // Break out of the potential start loop if we booked one!
      if (localAnchorFound) break;
    }

    // Break out of the outer student slot loop if we successfully booked one!
    if (localAnchorFound) {
      anchorFound = true;
      break;
    }
  }

  if (!anchorFound || !matchedCoachId || !finalStartTimeUTC || !matchingSlot) {
    console.log(`No available coach found for student ${student_id}`);
    // Returning 200 safely allows the Stripe webhook to finish without crashing, but an admin alert should be sent.
    return { success: false, status: 200, message: "No coach available for requested times" };
  }

  console.log(`MATCH FOUND! Anchor UTC start is ${finalStartTimeUTC.toISOString()} with coach ${matchedCoachId}`);

  // Insert a pending booked slot for admin approval. Pending slots are visible
  // to admins but do not block future matching until approved.
  const { error: bookedSlotError } = await supabase
    .from("booked_slots")
    .insert({
      coach_id: matchedCoachId,
      student_id: student_id,
      weekday: matchingSlot.weekday,
      start_time: matchingSlot.start_time_new,
      end_time: matchingSlot.end_time_new,
      timezone: matchingSlot.timezone,
      status: "pending",
      num_sessions: num_classes,
      start_date: finalStartTimeUTC.tz(matchingSlot.timezone).format("YYYY-MM-DD"),
    });

  if (bookedSlotError) {
    console.error("Failed to insert into booked_slots:", bookedSlotError);
    return { success: false, status: 500, error: "Failed to reserve booked slot" };
  }

  revalidatePath("/profiles");
  revalidatePath("/admin");
  return { success: true, status: 200, message: "Coach match pending admin approval" };
}

type BookedSlotForApproval = {
  id: string;
  coach_id: string;
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  status: string;
  num_sessions: number | null;
  start_date: string | null;
};

type GeneratedSession = TablesInsert<"sessions">;

function bookedSlotRangeForDate(
  bookedSlot: Pick<BookedSlotForApproval, "weekday" | "start_time" | "end_time" | "timezone">,
  candidateStartUTC: dayjs.Dayjs,
) {
  const bsDateLocal = candidateStartUTC.tz(bookedSlot.timezone).day(bookedSlot.weekday);
  const bsStartLocal = dayjs.tz(`${bsDateLocal.format("YYYY-MM-DD")}T${bookedSlot.start_time}`, bookedSlot.timezone);
  const bsEndLocal = dayjs.tz(`${bsDateLocal.format("YYYY-MM-DD")}T${bookedSlot.end_time}`, bookedSlot.timezone);

  return {
    startUTC: bsStartLocal.utc(),
    endUTC: bsEndLocal.utc(),
  };
}

function nextMatchingDateForWeekday(weekday: number) {
  let testDate = dayjs.utc().add(1, "day");
  while (testDate.day() !== weekday) {
    testDate = testDate.add(1, "day");
  }
  return testDate.format("YYYY-MM-DD");
}

function startDateForBookedSlot(bookedSlot: Pick<BookedSlotForApproval, "weekday" | "start_date">) {
  return bookedSlot.start_date || nextMatchingDateForWeekday(bookedSlot.weekday);
}

function timeStringToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function bookedSlotDurationMinutes(bookedSlot: Pick<BookedSlotForApproval, "start_time" | "end_time">) {
  return Math.max(1, timeStringToMinutes(bookedSlot.end_time) - timeStringToMinutes(bookedSlot.start_time));
}

async function hasActiveBookedSlotConflict(
  supabase: ReturnType<typeof createServiceRoleClient>,
  bookedSlot: BookedSlotForApproval,
) {
  const anchorDate = startDateForBookedSlot(bookedSlot);
  const anchorStartUTC = dayjs.tz(`${anchorDate}T${bookedSlot.start_time}`, bookedSlot.timezone).utc();
  const anchorEndUTC = dayjs.tz(`${anchorDate}T${bookedSlot.end_time}`, bookedSlot.timezone).utc();

  const { data: activeSlots } = await supabase
    .from("booked_slots")
    .select("*")
    .eq("status", "active")
    .or(`coach_id.eq.${bookedSlot.coach_id},student_id.eq.${bookedSlot.student_id}`);

  for (const activeSlot of activeSlots ?? []) {
    if (!activeSlot.timezone || !activeSlot.start_time || !activeSlot.end_time) continue;
    const activeRange = bookedSlotRangeForDate(activeSlot, anchorStartUTC);
    if (anchorStartUTC.isBefore(activeRange.endUTC) && anchorEndUTC.isAfter(activeRange.startUTC)) {
      return true;
    }
  }

  return false;
}

async function ensureCoachStudentJunction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  coachId: string,
  studentId: string,
) {
  const { data: existingJunction } = await supabase
    .from("coach_students")
    .select("*")
    .eq("coach_id", coachId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingJunction) return;

  const { error: junctionError } = await supabase
    .from("coach_students")
    .insert({ coach_id: coachId, student_id: studentId });

  if (junctionError) {
    console.error("Failed to insert into coach_students junction:", junctionError);
  }
}

export async function approvePendingBookedSlot(bookedSlotId: string) {
  const supabase = createServiceRoleClient();

  const { data: bookedSlot, error: slotError } = await supabase
    .from("booked_slots")
    .select("*")
    .eq("id", bookedSlotId)
    .eq("status", "pending")
    .single();

  if (slotError || !bookedSlot) {
    return { success: false, status: 404, error: "Pending booked slot not found" };
  }

  const numSessions = bookedSlot.num_sessions ?? 0;
  if (numSessions <= 0) {
    return { success: false, status: 400, error: "Booked slot does not have a valid num_sessions value" };
  }

  if (!bookedSlot.timezone || !bookedSlot.start_time || !bookedSlot.end_time) {
    return { success: false, status: 400, error: "Booked slot is missing timing information" };
  }

  const typedSlot = bookedSlot as BookedSlotForApproval;

  const hasConflict = await hasActiveBookedSlotConflict(supabase, typedSlot);
  if (hasConflict) {
    return { success: false, status: 409, error: "This slot now conflicts with an active recurring booking" };
  }

  const localAnchorDate = startDateForBookedSlot(typedSlot);
  const finalStartTimeUTC = dayjs.tz(`${localAnchorDate}T${typedSlot.start_time}`, typedSlot.timezone).utc();
  const durationMinutes = bookedSlotDurationMinutes(typedSlot);

  const generatedSessions: GeneratedSession[] = [];
  let successfullyBooked = 0;
  let weekOffset = 0;

  while (successfullyBooked < numSessions) {

    // Re-interpret the wall-clock time in the student's timezone each week so the
    // local time stays fixed (e.g. always 3 PM) even across DST transitions.
    const localAnchor = finalStartTimeUTC.tz(typedSlot.timezone);
    const anchorDateStr = localAnchor.format('YYYY-MM-DD');
    const anchorTimeStr = localAnchor.format('HH:mm:ss');
    const targetDate = dayjs(anchorDateStr).add(weekOffset, 'week').format('YYYY-MM-DD');
    const loopStart = dayjs.tz(`${targetDate}T${anchorTimeStr}`, typedSlot.timezone);
    const loopEnd = loopStart.add(durationMinutes, 'minute');

    const loopStartUTC = loopStart.utc().toISOString();
    const loopEndUTC = loopEnd.utc().toISOString();

    // Quick final check against the real database calendar to guarantee no future overlaps
    const { data: collision } = await supabase
      .from("sessions")
      .select("id")
      .eq("coach_id", typedSlot.coach_id)
      .lt("start_time", loopEndUTC)
      .gt("end_time", loopStartUTC)
      .maybeSingle();

    const { data: studentCollision } = await supabase
      .from("sessions")
      .select("id")
      .eq("student_id", typedSlot.student_id)
      .lt("start_time", loopEndUTC)
      .gt("end_time", loopStartUTC)
      .maybeSingle();

    if (!collision && !studentCollision) {
      generatedSessions.push({
        coach_id: typedSlot.coach_id,
        student_id: typedSlot.student_id,
        weekday: typedSlot.weekday,
        start_time: loopStartUTC,
        end_time: loopEndUTC
      });
      successfullyBooked++;
    }

    weekOffset++;
    // Hard limit failsafe so it doesn't loop forever if their calendar block is entirely clogged
    if (weekOffset > numSessions * 3) {
      console.warn("Exceeded safe loop boundary skipping filled weeks.");
      break;
    }
  }

  if (generatedSessions.length < numSessions) {
    return { success: false, status: 409, error: "Could not generate all requested sessions without conflicts" };
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

  const { error: activateError } = await supabase
    .from("booked_slots")
    .update({ status: "active" })
    .eq("id", typedSlot.id)
    .eq("status", "pending");

  if (activateError) {
    console.error("Failed to activate booked slot:", activateError);
    return { success: false, status: 500, error: "Sessions were created but booked slot activation failed" };
  }

  await ensureCoachStudentJunction(supabase, typedSlot.coach_id, typedSlot.student_id);

  revalidatePath("/profiles");
  revalidatePath("/admin");
  return { success: true, status: 200, message: `Successfully scheduled ${generatedSessions.length} classes!` };
}
