"use client";

import { memo } from "react";

type Props = {
  title: string; // card header text
  instruction: string; // body text describing what the student should do
  url: string | null; // Supabase storage public URL for the task file
};

/**
 * Taskcard displays a single task with a link to its file
 */
const TaskCard = memo(function TaskCard({ title, instruction, url }: Props) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col h-full min-h-[300px]">
      {/* Dark header bar showing the task type */}
      <div className="bg-[#2B4257] text-white p-4 font-semibold text-sm tracking-wide">
        {title}
      </div>

      <div className="p-6 text-[#1f2e3b] flex-1 flex flex-col gap-4 text-sm">
        <p className="font-bold">{instruction}</p>

        {/* Link to the task file if one has been uploaded */}
        <div className="space-y-1">
          {url ? (
            <a href={url} className="text-[#2B4257] underline font-medium">
              Click To Get Task!
            </a>
          ) : (
            <span className="text-gray-400">No task file available.</span>
          )}
        </div>
      </div>
    </div>
  );
});

export default TaskCard;
