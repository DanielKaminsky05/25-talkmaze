"use client";

interface TokenIconProps {
  iconUrl: string | null;
  title: string;
  className?: string;
}

/**
 * Displays the token icon as either an image (from bucket URL) or as an emoji
*/
export function TokenIcon({ iconUrl, title, className }: TokenIconProps) {
  if (iconUrl && (iconUrl.startsWith("http") || iconUrl.startsWith("/"))) {
    return (
      <img
        src={iconUrl}
        alt={title}
        className={className ?? "w-full h-full object-contain"}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={title}
      className={`${className ?? ""} inline-flex items-center justify-center leading-none`}
      style={{ fontSize: "24px" }}
    >
      {iconUrl ?? "🧭"}
    </span>
  );
}
