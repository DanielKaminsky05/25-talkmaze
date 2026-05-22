import type { SessionProp } from "./types";
import { formatDate, formatTime, getDurationMin } from "./sessionDateUtils";

export default function SessionCard({ session }: { session: SessionProp }) {
  const durationMin = getDurationMin(session.start_time, session.end_time);

  return (
    <div className="w-full min-h-[66px] xl:min-h-[72px] px-3 py-3 xl:px-4 xl:py-4 border-[0.5px] rounded-xl font-semibold border-[#4E4C4C] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-between gap-2 xl:gap-3 bg-white text-[#2B4257] hover:shadow-md transition-shadow">
      <div className="min-w-0">
        <p className="leading-tight text-sm xl:text-base">
          {formatDate(session.start_time)}
        </p>
        <p className="text-xs xl:text-sm font-normal text-[#4E4C4C] mt-0.5 truncate">
          {session.studentName}
          {session.coachName && (
            <span className="text-[#2B4257]"> · with {session.coachName}</span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0 ml-1 xl:ml-3">
        <p className="leading-tight text-sm xl:text-base">
          {formatTime(session.start_time)}
        </p>
        <p className="text-[11px] font-normal text-[#4E4C4C]">
          {durationMin !== null ? `${durationMin} min` : "—"}
        </p>
      </div>
    </div>
  );
}
