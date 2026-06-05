import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * `clsx` handles conditional/array inputs; `twMerge` dedupes conflicting
 * Tailwind utilities so a caller's `className` override wins.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
