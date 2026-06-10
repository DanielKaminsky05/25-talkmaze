"use client";

import { memo } from "react";
import DOMPurify from "dompurify";
import { Card } from "@/src/components/ui/card";

type Props = {
  title: string;
  url: string | null;
  richDescription?: string | null;
  optional?: boolean;
};

const TaskCard = memo(function TaskCard({
  title,
  url,
  richDescription,
  optional,
}: Props) {
  const hasRichDesc = richDescription && richDescription !== "<p></p>";

  return (
    <Card
      variant="light"
      shadow="lg"
      padding="none"
      className="overflow-hidden h-full min-h-75"
    >
      <div className="bg-secondary text-white p-4 font-semibold text-sm tracking-wide">
        {title}{optional ? " (Optional)" : ""}
      </div>

      <div className="p-6 text-[#1f2e3b] flex-1 flex flex-col gap-4 text-sm">
        {hasRichDesc ? (
          <div
            className="rich-text text-sm text-[#1f2e3b]"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(richDescription!),
            }}
          />
        ) : (
          <span className="text-gray-400">No task description.</span>
        )}

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
    </Card>
  );
});

export default TaskCard;
