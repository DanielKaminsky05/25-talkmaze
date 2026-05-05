import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/src/services/supabase/service";
import type {
  BookedSlotForApproval,
  GeneratedSession,
  SchedulingResult,
} from "@/src/lib/scheduling/types";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function assignCoachToStudent(
  student_id: string,
  num_classes: number,
): Promise<SchedulingResult> {
  console.log(
    `Starting bulk booking for student ${student_id} for ${num_classes} classes.`,
  );
  const supabase = createServiceRoleClient();

  // 1. Fetch student availability
  const { data: studentSlots } = await supabase
    .from("student_availabilities")
    .select("*")
    .eq("student_id", student_id);

  if (!studentSlots || studentSlots.length === 0) {
    return {
      success: false,
      status: 400,
      message: "Student has no availability configured",
    };
  }

  let matchedCoachId: string | null = null;

  // Start searching dates from tomorrow
  const searchStartDate = dayjs.utc().add(1, "day");

  let anchorFound = false;
  let matchingSlot: any = null;
  let finalStartTimeUTC: dayjs.Dayjs | null = null;

  // Shuffle the student's requested slots to evenly load balance which day of the week they get
  const shuffledStudentSlots = studentSlots.sort(() => 0.5 - Math.random());

  console.log(
    `[MATCHMAKER] Student requested ${studentSlots.length} available slots.`,
  );

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

    console.log(
      `[MATCHMAKER] Evaluating Student Slot: Weekday ${slot.weekday} at ${slot.start_time_new} (${slot.timezone})`,
    );

    // Find the next calendar date that matches this slot's weekday, starting from tomorrow
    let testDate = searchStartDate;
    while (testDate.day() !== slot.weekday) {
      testDate = testDate.add(1, "day");
    }

    // Construct the concrete moment in the student's local timezone
    const dateString = testDate.format("YYYY-MM-DD");
    const blockStartLocal = dayjs.tz(
      `${dateString}T${slot.start_time_new}`,
      slot.timezone,
    );
    const blockEndLocal = dayjs.tz(
      `${dateString}T${slot.end_time_new}`,
      slot.timezone,
    );

    // Generate potential 1-hour start times within this block, stepped by 10 minutes
    const potentialStarts: dayjs.Dayjs[] = [];
    let currentStart = blockStartLocal;

    // Ensure we start on a 10-minute boundary to avoid random times
    const minutes = currentStart.minute();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      currentStart = currentStart.add(10 - remainder, "minute");
    }

    // A session is 1 hour long. So the latest start time is blockEnd - 1 hour.
    while (currentStart.add(1, "hour").valueOf() <= blockEndLocal.valueOf()) {
      potentialStarts.push(currentStart);
      currentStart = currentStart.add(10, "minute");
    }

    if (potentialStarts.length === 0) {
      console.log(
        `[MATCHMAKER] Slot too short for a 1-hour session: ${slot.start_time_new} to ${slot.end_time_new}`,
      );
      continue;
    }

    let localAnchorFound = false;

    // Now try each potential 1-hour block within this availability window
    for (const startLocal of potentialStarts) {
      const endLocal = startLocal.add(1, "hour");
      const startUTC = startLocal.utc();
      const endUTC = endLocal.utc();

      console.log(
        `[MATCHMAKER] Testing Potential Anchor: ${startUTC.toISOString()} (UTC)`,
      );

      // Check if this concrete moment conflicts with the student's OWN active booked slots
      let studentHasPermanentConflict = false;
      if (studentBookedSlots) {
        for (const bs of studentBookedSlots) {
          if (!bs.timezone || !bs.start_time || !bs.end_time) continue;
          const bsDateLocal = startUTC.tz(bs.timezone).day(bs.weekday);
          const bsStartLocal = dayjs.tz(
            `${bsDateLocal.format("YYYY-MM-DD")}T${bs.start_time}`,
            bs.timezone,
          );
          const bsEndLocal = dayjs.tz(
            `${bsDateLocal.format("YYYY-MM-DD")}T${bs.end_time}`,
            bs.timezone,
          );

          if (
            startUTC.isBefore(bsEndLocal.utc()) &&
            endUTC.isAfter(bsStartLocal.utc())
          ) {
            studentHasPermanentConflict = true;
            break;
          }
        }
      }
      if (studentHasPermanentConflict) {
        console.log(
          `[MATCHMAKER] Student already has a permanent booked slot at this time.`,
        );
        continue;
      }

      if (!coaches || coaches.length === 0) {
        console.log(
          `[MATCHMAKER] No active coach availabilities found in the DB.`,
        );
        break; // no coaches at all
      }

      // Shuffle the array to ensure round-robin assignment instead of first-come-first-serve
      const shuffledCoaches = coaches.sort(() => 0.5 - Math.random());

      // Loop through candidate coaches and verify there are no discrete calendar collisions
      for (const coach of shuffledCoaches) {
        if (!coach.timezone || !coach.start_time_new || !coach.end_time_new)
          continue;

        // Calculate exactly what time this UTC class will happen in the coach's living room
        const coachTargetStart = startUTC.tz(coach.timezone);
        const coachTargetEnd = endUTC.tz(coach.timezone);

        // 1. Is the class on the correct coach's weekday?
        if (coachTargetStart.day() !== coach.weekday) continue;

        // 2. Is the class within the coach's start and end times?
        const coachLocalStartTimeStr = coachTargetStart.format("HH:mm:ss");
        const coachLocalEndTimeStr = coachTargetEnd.format("HH:mm:ss");

        if (
          coachLocalStartTimeStr < coach.start_time_new ||
          coachLocalEndTimeStr > coach.end_time_new
        ) {
          continue;
        }

        console.log(
          `[MATCHMAKER] Coach ${coach.coach_id} is awake and working during this time! Checking calendar collisions...`,
        );

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
            const bsStartLocal = dayjs.tz(
              `${bsDateLocal.format("YYYY-MM-DD")}T${bs.start_time}`,
              bs.timezone,
            );
            const bsEndLocal = dayjs.tz(
              `${bsDateLocal.format("YYYY-MM-DD")}T${bs.end_time}`,
              bs.timezone,
            );

            if (
              startUTC.isBefore(bsEndLocal.utc()) &&
              endUTC.isAfter(bsStartLocal.utc())
            ) {
              coachHasPermanentConflict = true;
              break;
            }
          }
        }

        if (coachHasPermanentConflict) {
          console.log(
            `[MATCHMAKER] Collision: Coach ${coach.coach_id} has a permanent booked slot at this time!`,
          );
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
            console.log(
              `[MATCHMAKER] MATCH FOUND: Coach ${coach.coach_id} assigned.`,
            );
            matchedCoachId = coach.coach_id;

            // Re-assign the matchingSlot with the precise 10-minute offset we discovered!
            matchingSlot = {
              ...slot,
              start_time_new: startLocal.format("HH:mm:ss"),
              end_time_new: endLocal.format("HH:mm:ss"),
            };

            finalStartTimeUTC = startUTC;
            localAnchorFound = true;
            break;
          } else {
            console.log(
              `[MATCHMAKER] Collision: Student is already booked at this time!`,
            );
          }
        } else {
          console.log(
            `[MATCHMAKER] Collision: Coach ${coach.coach_id} is already booked at this time!`,
          );
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
    return {
      success: false,
      status: 200,
      message: "No coach available for requested times",
    };
  }

  console.log(
    `MATCH FOUND! Anchor UTC start is ${finalStartTimeUTC.toISOString()} with coach ${matchedCoachId}`,
  );

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
      start_date: finalStartTimeUTC
        .tz(matchingSlot.timezone)
        .format("YYYY-MM-DD"),
    });

  if (bookedSlotError) {
    console.error("Failed to insert into booked_slots:", bookedSlotError);
    return {
      success: false,
      status: 500,
      error: "Failed to reserve booked slot",
    };
  }

  revalidatePath("/profiles");
  revalidatePath("/admin");
  return {
    success: true,
    status: 200,
    message: "Coach match pending admin approval",
  };
}

export async function approvePendingBookedSlot(
  bookedSlotId: string,
): Promise<SchedulingResult> {
  const supabase = createServiceRoleClient();

  const { data: bookedSlot, error: slotError } = await supabase
    .from("booked_slots")
    .select("*")
    .eq("id", bookedSlotId)
    .eq("status", "pending")
    .single();

  if (slotError || !bookedSlot) {
    return {
      success: false,
      status: 404,
      error: "Pending booked slot not found",
    };
  }

  const numSessions = bookedSlot.num_sessions ?? 0;
  if (numSessions <= 0) {
    return {
      success: false,
      status: 400,
      error: "Booked slot does not have a valid num_sessions value",
    };
  }

  if (!bookedSlot.timezone || !bookedSlot.start_time || !bookedSlot.end_time) {
    return {
      success: false,
      status: 400,
      error: "Booked slot is missing timing information",
    };
  }

  const typedSlot = bookedSlot as BookedSlotForApproval;

  const hasConflict = await hasActiveBookedSlotConflict(supabase, typedSlot);
  if (hasConflict) {
    return {
      success: false,
      status: 409,
      error: "This slot now conflicts with an active recurring booking",
    };
  }

  const localAnchorDate = startDateForBookedSlot(typedSlot);
  const finalStartTimeUTC = dayjs
    .tz(`${localAnchorDate}T${typedSlot.start_time}`, typedSlot.timezone)
    .utc();
  const durationMinutes = bookedSlotDurationMinutes(typedSlot);

  const generatedSessions: GeneratedSession[] = [];
  let successfullyBooked = 0;
  let weekOffset = 0;

  while (successfullyBooked < numSessions) {
    // Re-interpret the wall-clock time in the student's timezone each week so the
    // local time stays fixed (e.g. always 3 PM) even across DST transitions.
    const localAnchor = finalStartTimeUTC.tz(typedSlot.timezone);
    const anchorDateStr = localAnchor.format("YYYY-MM-DD");
    const anchorTimeStr = localAnchor.format("HH:mm:ss");
    const targetDate = dayjs(anchorDateStr)
      .add(weekOffset, "week")
      .format("YYYY-MM-DD");
    const loopStart = dayjs.tz(
      `${targetDate}T${anchorTimeStr}`,
      typedSlot.timezone,
    );
    const loopEnd = loopStart.add(durationMinutes, "minute");

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
        end_time: loopEndUTC,
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
    return {
      success: false,
      status: 409,
      error: "Could not generate all requested sessions without conflicts",
    };
  }

  // 3. Bulk Insert
  if (generatedSessions.length > 0) {
    const { error: sessionError } = await supabase
      .from("sessions")
      .insert(generatedSessions);

    if (sessionError) {
      console.error("SESSION BULK INSERT ERROR:", sessionError);
      return {
        success: false,
        status: 500,
        error: "Failed to bulk create sessions",
      };
    }
  }

  const { error: activateError } = await supabase
    .from("booked_slots")
    .update({ status: "active" })
    .eq("id", typedSlot.id)
    .eq("status", "pending");

  if (activateError) {
    console.error("Failed to activate booked slot:", activateError);
    return {
      success: false,
      status: 500,
      error: "Sessions were created but booked slot activation failed",
    };
  }

  await ensureCoachStudentJunction(
    supabase,
    typedSlot.coach_id,
    typedSlot.student_id,
  );

  revalidatePath("/profiles");
  revalidatePath("/admin");
  return {
    success: true,
    status: 200,
    message: `Successfully scheduled ${generatedSessions.length} classes!`,
  };
}

function bookedSlotRangeForDate(
  bookedSlot: Pick<
    BookedSlotForApproval,
    "weekday" | "start_time" | "end_time" | "timezone"
  >,
  candidateStartUTC: dayjs.Dayjs,
) {
  const bsDateLocal = candidateStartUTC
    .tz(bookedSlot.timezone)
    .day(bookedSlot.weekday);
  const bsStartLocal = dayjs.tz(
    `${bsDateLocal.format("YYYY-MM-DD")}T${bookedSlot.start_time}`,
    bookedSlot.timezone,
  );
  const bsEndLocal = dayjs.tz(
    `${bsDateLocal.format("YYYY-MM-DD")}T${bookedSlot.end_time}`,
    bookedSlot.timezone,
  );

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

function startDateForBookedSlot(
  bookedSlot: Pick<BookedSlotForApproval, "weekday" | "start_date">,
) {
  return bookedSlot.start_date || nextMatchingDateForWeekday(bookedSlot.weekday);
}

function timeStringToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function bookedSlotDurationMinutes(
  bookedSlot: Pick<BookedSlotForApproval, "start_time" | "end_time">,
) {
  return Math.max(
    1,
    timeStringToMinutes(bookedSlot.end_time) -
      timeStringToMinutes(bookedSlot.start_time),
  );
}

async function hasActiveBookedSlotConflict(
  supabase: ReturnType<typeof createServiceRoleClient>,
  bookedSlot: BookedSlotForApproval,
) {
  const anchorDate = startDateForBookedSlot(bookedSlot);
  const anchorStartUTC = dayjs
    .tz(`${anchorDate}T${bookedSlot.start_time}`, bookedSlot.timezone)
    .utc();
  const anchorEndUTC = dayjs
    .tz(`${anchorDate}T${bookedSlot.end_time}`, bookedSlot.timezone)
    .utc();

  const { data: activeSlots } = await supabase
    .from("booked_slots")
    .select("*")
    .eq("status", "active")
    .or(
      `coach_id.eq.${bookedSlot.coach_id},student_id.eq.${bookedSlot.student_id}`,
    );

  for (const activeSlot of activeSlots ?? []) {
    if (!activeSlot.timezone || !activeSlot.start_time || !activeSlot.end_time)
      continue;
    const activeRange = bookedSlotRangeForDate(activeSlot, anchorStartUTC);
    if (
      anchorStartUTC.isBefore(activeRange.endUTC) &&
      anchorEndUTC.isAfter(activeRange.startUTC)
    ) {
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
    console.error(
      "Failed to insert into coach_students junction:",
      junctionError,
    );
  }
}
