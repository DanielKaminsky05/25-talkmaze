"use client";

import { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SlideshowViewerInnerProps {
  url: string;
}

export default function SlideshowViewerInner({ url }: SlideshowViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const prev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const next = () => setCurrentPage((p) => Math.min(numPages, p + 1));

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] text-white/50 font-semibold">
        Failed to load slideshow.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 pb-6">
      <div className="w-full overflow-hidden rounded-b-3xl bg-white flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={() => setLoadError(true)}
          loading={
            <div className="flex items-center justify-center h-[400px] w-full text-[#2b4257] font-semibold">
              Loading slides...
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={containerRef.current?.clientWidth ?? 900}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {numPages > 0 && (
        <div className="flex items-center gap-6">
          <button
            onClick={prev}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2b4257] text-white disabled:opacity-30 hover:bg-[#1f2e3b] transition-colors"
            aria-label="Previous slide"
          >
            ←
          </button>
          <span className="text-white font-semibold text-sm">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={next}
            disabled={currentPage === numPages}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2b4257] text-white disabled:opacity-30 hover:bg-[#1f2e3b] transition-colors"
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
