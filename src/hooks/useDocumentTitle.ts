"use client";
import { useEffect } from "react";

const BRAND = "Talkmaze";

/**
 * Sets the browser tab title to `${title} | Talkmaze` while the calling client
 * component is mounted, restoring the previous title on unmount
 *
 * For SERVER pages use the Next.js Metadata API instead
 *
 * @param title Page name without the brand suffix (e.g. "Students"). Falsy
 *              values fall back to the bare brand.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    const previous = document.title;
    const next = title ? `${title} | ${BRAND}` : BRAND;
    document.title = next;
    return () => {
      if (document.title === next) document.title = previous;
    };
  }, [title]);
}
