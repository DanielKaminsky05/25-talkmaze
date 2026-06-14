import { fullName } from "@/src/utils/formatName";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import type { StudentProp } from "./types";

interface Props {
  students: StudentProp[];
  selected: string | null;
  onChange: (id: string | null) => void;
}

// Radix Select disallows an empty-string item value, so the "no filter" state
// is represented by this sentinel value
const ALL = "all";

export default function StudentFilter({
  students,
  selected,
  onChange,
}: Props) {
  return (
    <Select
      value={selected ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? null : v)}
    >
      <SelectTrigger
        size="sm"
        className="w-auto max-w-[min(220px,56vw)] xl:max-w-[min(240px,62vw)]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[190px] max-w-[260px]">
        <SelectItem value={ALL}>All Students</SelectItem>
        {students.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {fullName(s.first_name, s.last_name, "Student")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
