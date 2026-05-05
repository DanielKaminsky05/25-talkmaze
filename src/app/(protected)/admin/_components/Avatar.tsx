"use client";

export default function Avatar({
  letter,
  color = "text-[#B1E7D6]",
  bg = "bg-[#B1E7D6]/15",
}: {
  letter: string;
  color?: string;
  bg?: string;
}) {
  return (
    <div
      className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}
    >
      <span className={`${color} text-sm font-bold`}>
        {letter.toUpperCase()}
      </span>
    </div>
  );
}
