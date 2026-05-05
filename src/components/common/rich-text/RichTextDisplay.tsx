"use client";

import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  title: string;
  content: string | null;
}

/**
 * RichTextDisplay - Read-only renderer for coach feedback
 *
 * Security against XSS attacks by sanitizing stored HTML with DOMPurify
 * Renders nothing if the coach hasn't written any feedback yet.
 */
export default function RichTextDisplay({
  title,
  content,
}: RichTextDisplayProps) {
  // Tiptap serializes an empty editor as "<p></p>", not an empty string
  if (!content || content === "<p></p>") return null;

  const clean = DOMPurify.sanitize(content);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="px-5 py-3" style={{ backgroundColor: "#2B4257" }}>
        <span className="text-white font-semibold text-sm">{title}</span>
      </div>
      <div
        className="p-5 bg-white rich-text text-gray-800"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
