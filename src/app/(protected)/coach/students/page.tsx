import { Users } from "lucide-react";

/**
 * Empty state for /coach/students: the list is shown by the layout on the left;
 * this prompts the coach to pick one (mirrors /coach/message's empty state).
 */
export default function CoachStudentsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-[#1F2E3B]/55">
      <Users size={48} />
      <p className="text-sm font-medium">
        Select a student to view their details
      </p>
    </div>
  );
}
