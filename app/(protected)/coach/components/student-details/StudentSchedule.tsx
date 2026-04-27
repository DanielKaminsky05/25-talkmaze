const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m} ${period}`;
}

interface Session {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  coach?: { name?: string } | null;
}

interface StudentScheduleProps {
  sessions: Session[];
  loading: boolean;
}

export default function StudentSchedule({
  sessions,
  loading,
}: StudentScheduleProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-400">No sessions scheduled.</p>
    );
  }

  const byDay = sessions.reduce(
    (acc: Record<number, Session[]>, s) => {
      acc[s.weekday] = acc[s.weekday] || [];
      acc[s.weekday].push(s);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {DAYS.map((day, idx) => {
        const daySessions = byDay[idx] || [];
        if (daySessions.length === 0) return null;

        return (
          <div key={day}>
            <p className="text-xs font-semibold text-[#2B4257]/60 uppercase tracking-wider mb-2">
              {day}
            </p>
            <div className="flex flex-wrap gap-2">
              {daySessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-[#2B4257]/10 rounded-lg px-3 py-2 text-xs shadow-sm"
                >
                  <div className="font-medium text-gray-800">
                    {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    {s.coach?.name || "Coach TBD"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
