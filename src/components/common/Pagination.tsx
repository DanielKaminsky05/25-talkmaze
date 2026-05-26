interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  variant?: "dark" | "light";
}

const VARIANT_CLASSES = {
  dark: {
    summary: "text-white/40",
    summaryEmphasis: "text-white/70 font-medium",
    pageIndicator: "text-white/50",
    button:
      "text-white/60 bg-white/5 hover:bg-white/10 hover:text-white disabled:opacity-30",
    emptyTotal: "text-white/30",
  },
  light: {
    summary: "text-gray-500",
    summaryEmphasis: "text-[#2B4257] font-medium",
    pageIndicator: "text-gray-500",
    button:
      "text-[#2B4257] bg-[#2B4257]/5 hover:bg-[#2B4257]/10 disabled:opacity-40",
    emptyTotal: "text-gray-400",
  },
} as const;

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  variant = "dark",
}: PaginationProps) {
  const styles = VARIANT_CLASSES[variant];

  if (totalPages <= 1) {
    return totalItems > 0 ? (
      <p className={`mt-4 text-xs ${styles.emptyTotal}`}>
        {totalItems} {totalItems === 1 ? "record" : "records"} total
      </p>
    ) : null;
  }

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className={`text-xs ${styles.summary}`}>
        Showing{" "}
        <span className={styles.summaryEmphasis}>
          {start}–{end}
        </span>{" "}
        of <span className={styles.summaryEmphasis}>{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-xs font-medium disabled:cursor-not-allowed transition-colors ${styles.button}`}
        >
          Prev
        </button>
        <span className={`px-3 py-1.5 text-xs ${styles.pageIndicator}`}>
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-xs font-medium disabled:cursor-not-allowed transition-colors ${styles.button}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
