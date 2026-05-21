import { useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { fullName } from "@/src/utils/formatName";
import type { StudentProp } from "./types";

interface Props {
  students: StudentProp[];
  selected: string | null;
  onChange: (id: string | null) => void;
}

export default function StudentFilter({ students, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const selectedStudent = selected
    ? students.find((s) => s.id === selected)
    : null;
  const label = selectedStudent
    ? fullName(selectedStudent.first_name, selectedStudent.last_name, "Student")
    : "All Students";

  return (
    <div className="relative max-w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[min(220px,56vw)] xl:max-w-[min(240px,62vw)] items-center gap-2 bg-[#1F2E3B] border border-[#2B4257] hover:border-[#65CFAD] text-white text-xs xl:text-sm px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
      >
        <User size={13} className="text-[#65CFAD] shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown
          size={13}
          className={`text-[#65CFAD] transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-20 bg-[#1F2E3B] border border-[#2B4257] rounded-xl shadow-2xl min-w-[190px] max-w-[260px] overflow-hidden">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
              selected === null
                ? "bg-[#65CFAD]/20 text-[#65CFAD] font-semibold"
                : "text-white hover:bg-[#142535]"
            }`}
          >
            All Students
          </button>
          {students.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                selected === s.id
                  ? "bg-[#65CFAD]/20 text-[#65CFAD] font-semibold"
                  : "text-white hover:bg-[#142535]"
              }`}
            >
              {fullName(s.first_name, s.last_name, "Student")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
