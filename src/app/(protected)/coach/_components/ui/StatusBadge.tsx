const LABELS: Record<number, string> = {
  1: "Not Started",
  2: "In Progress",
  3: "Completed",
};

const STYLES: Record<number, string> = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-green-100 text-green-700",
};

interface StatusBadgeProps {
  status: number;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        STYLES[status] ?? STYLES[1]
      }`}
    >
      {LABELS[status] ?? "Unknown"}
    </span>
  );
}
