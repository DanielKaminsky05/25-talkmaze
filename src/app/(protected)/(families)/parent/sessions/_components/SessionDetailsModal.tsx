import { X } from "lucide-react";
import type { SessionProp } from "./types";
import { formatDateTime, getDurationMin } from "./sessionDateUtils";

interface Props {
  session: SessionProp;
  onClose: () => void;
}

export default function SessionDetailsModal({ session, onClose }: Props) {
  const durationMin = getDurationMin(session.start_time, session.end_time);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-[#1F2E3B] text-lg font-semibold">
            Session Details
          </h2>
          <button
            onClick={onClose}
            className="text-[#2B4257]/70 hover:text-[#2B4257] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm text-[#2B4257]">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
              Student
            </p>
            <p className="font-medium">{session.studentName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
              Coach
            </p>
            <p className="font-medium">{session.coachName || "Not assigned"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
              Start
            </p>
            <p className="font-medium">{formatDateTime(session.start_time)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
              End
            </p>
            <p className="font-medium">
              {session.end_time ? formatDateTime(session.end_time) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#2B4257]/60">
              Duration
            </p>
            <p className="font-medium">
              {durationMin !== null ? `${durationMin} minutes` : "—"}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#2B4257] text-white text-sm font-medium hover:bg-[#24394a] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
