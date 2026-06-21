import { cn } from "@/src/utils/cn";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "size-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin",
        className,
      )}
    />
  );
}
