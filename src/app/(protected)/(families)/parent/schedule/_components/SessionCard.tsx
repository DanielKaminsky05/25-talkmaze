import type { SessionProp } from "./types";
import { formatDate, getDurationMin } from "../_lib/sessionDateUtils";
import { fmtLocalTime } from "@/src/utils/formatDateTime";
import { Badge } from "@/src/components/ui/badge";

interface Props {
  session: SessionProp;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function SessionCard({ session, selected, onSelect }: Props) {
  const durationMin = getDurationMin(session.start_time, session.end_time);
  const isPending = session.reschedule_status === "pending";

  const baseClasses =
    "w-full min-h-[66px] xl:min-h-[72px] px-3 py-3 xl:px-4 xl:py-4 border-[0.5px] rounded-xl font-semibold flex items-center justify-between gap-2 xl:gap-3 text-left transition-colors cursor-pointer";
  const stateClasses = selected
    ? "bg-[#2B4257] text-white border-[#2B4257] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)]"
    : "bg-white text-[#2B4257] border-[#4E4C4C] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] hover:shadow-md";

  const subTextClass = selected ? "text-white/70" : "text-[#4E4C4C]";
  const coachAccentClass = selected ? "text-white" : "text-[#2B4257]";

  return (
    <button
      type="button"
      onClick={() => onSelect(session.id)}
      aria-pressed={selected}
      className={`${baseClasses} ${stateClasses}`}
    >
      <div className="min-w-0">
        <p className="leading-tight text-sm xl:text-base flex items-center gap-2 flex-wrap">
          <span>{formatDate(session.start_time)}</span>
          {isPending && (
            <Badge
              variant="warning"
              className="text-[10px] uppercase tracking-wide xl:text-[11px]"
            >
              Reschedule pending
            </Badge>
          )}
        </p>
        <p
          className={`text-xs xl:text-sm font-normal mt-0.5 truncate ${subTextClass}`}
        >
          {session.studentName}
          {session.coachName && (
            <span className={coachAccentClass}>
              {" "}
              · with {session.coachName}
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0 ml-1 xl:ml-3">
        <p className="leading-tight text-sm xl:text-base">
          {fmtLocalTime(session.start_time)}
        </p>
        <p className={`text-[11px] font-normal ${subTextClass}`}>
          {durationMin !== null ? `${durationMin} min` : "—"}
        </p>
      </div>
    </button>
  );
}
