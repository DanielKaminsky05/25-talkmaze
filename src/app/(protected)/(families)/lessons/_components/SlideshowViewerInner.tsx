"use client";

import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Altnative display mode where the first-slide of the ppt slideshow is used
 * as a thumbnail.
 * 
 * Render this component instead of the interactive slideshow if the
 * thumbnailMode prop is true. 
 */
function SlideshowThumbnail({ url }: { url: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [pdfAspect, setPdfAspect] = useState<number | null>(null);

  // Re-renders the component to maintain the ppt slide aspect ratio 
  useLayoutEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cover: fill container in both axes, clipping overflow symmetrically
  const renderWidth =
    dims.w > 0 && dims.h > 0
      ? pdfAspect !== null
        ? Math.max(dims.w, Math.round(dims.h * pdfAspect))
        : dims.w
      : 0;

  return (
    <div
      ref={divRef}
      className="w-full h-full overflow-hidden pointer-events-none flex justify-center items-center"
    >
      {renderWidth > 0 && (
        <Document file={url} loading={null} error={null}>
          <Page
            pageNumber={1}
            width={renderWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onRenderSuccess={({ originalWidth, originalHeight }) => {
              setPdfAspect(originalWidth / originalHeight);
            }}
          />
        </Document>
      )}
    </div>
  );
}

export interface SlideshowViewerInnerProps {
  url: string;
  /** Renders only page 1 at reduced size no controls, for use as a thumbnail */
  thumbnailMode?: boolean;
}

/**
 * Load and display the pdf file as an interactive slideshow.
 */
export default function SlideshowViewerInner({
  url,
  thumbnailMode = false,
}: SlideshowViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const onRenderSuccess = useCallback(({ height }: { height: number }) => {
    setPageHeight(height);
    setPageLoading(false);
  }, []);

  const prev = () => {
    setPageLoading(true);
    setCurrentPage((p) => Math.max(1, p - 1));
  };
  const next = () => {
    setPageLoading(true);
    setCurrentPage((p) => Math.min(numPages, p + 1));
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] text-white/50 font-semibold">
        Failed to load slideshow.
      </div>
    );
  }

  if (thumbnailMode) {
    return <SlideshowThumbnail url={url} />;
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 pb-6">
      <div
        className="w-full overflow-hidden rounded-b-3xl bg-white flex justify-center relative"
        style={{ minHeight: pageHeight ?? 400 }}
      >
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
            onRenderSuccess={onRenderSuccess}
            loading={<div style={{ height: pageHeight ?? 400 }} />}
          />
        </Document>
        {pageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="w-8 h-8 border-4 border-[#2b4257] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {numPages > 0 && (
        <div className="flex items-center gap-1.5 bg-[#1F2E3B]/10 px-2 py-1 rounded-full">
          <button
            onClick={prev}
            disabled={currentPage === 1 || pageLoading}
            className="w-9 h-9 rounded-full bg-[#65CFAD] shadow-md flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-30"
            aria-label="Previous slide"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M5 1L1 5L5 9"
                stroke="#1F2E3B"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="text-[1rem] font-bold text-white w-16 text-center tabular-nums">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={next}
            disabled={currentPage === numPages || pageLoading}
            className="w-9 h-9 rounded-full bg-[#65CFAD] shadow-md flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-30"
            aria-label="Next slide"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M1 1L5 5L1 9"
                stroke="#1F2E3B"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
