import type { PendingBooking } from "@/src/lib/scheduling/types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface PendingBookingCardProps {
  booking: PendingBooking;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * A single card in the pending bookings sidebar list.
 */
export default function PendingBookingCard({
  booking,
  isSelected,
  onClick,
}: PendingBookingCardProps) {
  // Fall back to generic labels when name fields are empty or null.
  const coachName = booking.coaches
    ? `${booking.coaches.first_name ?? ""} ${booking.coaches.last_name ?? ""}`.trim() ||
      "Coach"
    : "Coach";
  const studentName = booking.students
    ? `${booking.students.first_name ?? ""} ${booking.students.last_name ?? ""}`.trim() ||
      "Student"
    : "Student";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-[#1F2E3B] rounded-2xl p-4 border transition-colors ${
        isSelected
          ? "border-[#B1E7D6]/70"
          : "border-white/5 hover:border-white/15"
      }`}
    >
      <p className="text-white text-sm font-semibold truncate">{studentName}</p>
      <p className="text-white/45 text-xs mt-1 truncate">{coachName}</p>
      <p className="text-white/35 text-xs mt-2">
        {WEEKDAYS[booking.weekday] ?? "Weekly"} {booking.start_time.slice(0, 5)}
        -{booking.end_time.slice(0, 5)}
      </p>
      <p className="text-white/30 text-xs mt-1">
        {booking.num_sessions ?? 0} sessions
      </p>
    </button>
  );
}
