"use client";

import dynamic from "next/dynamic";
import type { SlideshowViewerInnerProps } from "./SlideshowViewerInner";

const SlideshowViewerInner = dynamic<SlideshowViewerInnerProps>(
  () => import("./SlideshowViewerInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] rounded-b-3xl bg-white text-[#2b4257] font-semibold">
        Loading slides...
      </div>
    ),
  }
);

interface SlideshowViewerProps {
  url: string;
  thumbnailMode?: boolean;
}

export default function SlideshowViewer({ url, thumbnailMode }: SlideshowViewerProps) {
  return <SlideshowViewerInner url={url} thumbnailMode={thumbnailMode} />;
}
