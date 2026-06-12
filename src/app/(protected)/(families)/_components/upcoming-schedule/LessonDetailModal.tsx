"use client";

import React from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import type { CoachingSession } from "@/src/lib/scheduling/types";

interface LessonDetailModalProps {
  lesson: CoachingSession;
  onClose: () => void;
}

export default function LessonDetailModal({
  lesson,
  onClose,
}: LessonDetailModalProps) {
  const startDate = new Date(lesson.start_date);
  const endDate = new Date(lesson.end_date);

  const dateStr = startDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent variant="light" size="lg">
        <DialogHeader>
          <DialogTitle>{lesson.title}</DialogTitle>
          <DialogDescription>
            {dateStr} · {timeStr}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#2B4257]/60">
              Student
            </label>
            <p className="text-lg font-bold text-[#2B4257]">
              {lesson.studentName}
            </p>
          </div>

          {lesson.coachName && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#2B4257]/60">
                Coach
              </label>
              <p className="text-lg text-[#2B4257] font-medium">
                {lesson.coachName}
              </p>
            </div>
          )}

          {lesson.description && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#2B4257]/60">
                Meeting Description
              </label>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-[#2B4257] text-sm whitespace-pre-wrap">
                  {lesson.description}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
