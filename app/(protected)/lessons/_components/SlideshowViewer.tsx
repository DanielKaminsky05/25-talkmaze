"use client";

import dynamic from "next/dynamic";

const SlideshowViewerInner = dynamic(() => import("./SlideshowViewerInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] rounded-b-3xl bg-white text-[#2b4257] font-semibold">
      Loading slides...
    </div>
  ),
});

interface SlideshowViewerProps {
  url: string;
}

export default function SlideshowViewer({ url }: SlideshowViewerProps) {
  return <SlideshowViewerInner url={url} />;
}
