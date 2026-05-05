import "server-only";

export type AvailabilitySlotInput = { start: string; end: string };
export type WeeklyAvailabilityInput = Record<string, AvailabilitySlotInput[]>;

export type AvailabilityRow = {
  student_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  start_time_new: string;
  end_time_new: string;
  timezone: string;
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

const toTimestamp = (time: string) => {
  return new Date(`1970-01-01T${time}:00Z`).toISOString();
};

export function buildAvailabilityRows(params: {
  studentId: string;
  weeklyAvailability: WeeklyAvailabilityInput;
  timeZone: string;
}): AvailabilityRow[] {
  const { studentId, weeklyAvailability, timeZone } = params;

  return Object.entries(weeklyAvailability).flatMap(([day, slots]) => {
    const weekday = dayMap[day];
    if (weekday === undefined) return [];

    return slots
      .filter((slot) => slot.start && slot.end)
      .map((slot) => ({
        student_id: studentId,
        weekday,
        start_time: toTimestamp(slot.start),
        end_time: toTimestamp(slot.end),
        start_time_new: `${slot.start}:00`,
        end_time_new: `${slot.end}:00`,
        timezone: timeZone,
      }));
  });
}
