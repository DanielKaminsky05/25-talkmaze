"use client";

import { useState } from "react";
import type { CoachingSession } from "@/src/lib/scheduling/types";
import CoachingSessionDetailModal from "./CoachingSessionDetailModal";
import { Card } from "@/src/components/ui/card";

export default function ScheduleList({
  schedule,
}: {
  schedule: CoachingSession[];
}) {
  const [selectedSession, setSelectedSession] =
    useState<CoachingSession | null>(null);

  return (
    <Card
      variant="accent"
      shadow="md"
      padding="none"
      className="w-full h-full max-h-full p-5 gap-3 overflow-hidden"
    >
      <h3 className="font-semibold text-[#1F2E3B]">Schedule</h3>

      {/* Session list or empty state */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 no-scrollbar">
        {schedule.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-[#2B4257] text-sm font-medium opacity-60">
              No upcoming sessions
            </p>
          </div>
        ) : (
          schedule.map((item) => {
            const startDate = new Date(item.start_date);
            const dateStr = startDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });
            const timeStr = startDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={item.id}
                onClick={() => setSelectedSession(item)}
                className="w-full min-h-[72px] p-4 border-[0.5px] rounded-xl font-semibold border-[#4E4C4C] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex justify-between items-center bg-white text-[#2B4257] cursor-pointer hover:shadow-md transition-shadow"
              >
                <div>
                  <p>{dateStr}</p>
                  {item.studentName && (
                    <p className="text-sm font-normal text-[#4E4C4C] mt-0.5">
                      {item.studentName}
                      {item.coachName && (
                        <span className="text-[#2B4257]">
                          {" "}
                          · with {item.coachName}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <p className="shrink-0 ml-3">{timeStr}</p>
              </div>
            );
          })
        )}
      </div>

      {selectedSession && (
        <CoachingSessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </Card>
  );
}
