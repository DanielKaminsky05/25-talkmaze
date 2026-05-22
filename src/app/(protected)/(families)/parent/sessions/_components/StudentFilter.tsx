import { fullName } from "@/src/utils/formatName";
import Dropdown, { DropdownItem } from "@/src/components/ui/Dropdown";
import type { StudentProp } from "./types";

interface Props {
  students: StudentProp[];
  selected: string | null;
  onChange: (id: string | null) => void;
}

export default function StudentFilter({ students, selected, onChange }: Props) {
  const selectedStudent = selected
    ? students.find((s) => s.id === selected)
    : null;
  const label = selectedStudent
    ? fullName(selectedStudent.first_name, selectedStudent.last_name, "Student")
    : "All Students";

  return (
    <Dropdown
      label={label}
      align="right"
      triggerClassName="max-w-[min(220px,56vw)] xl:max-w-[min(240px,62vw)]"
      menuClassName="min-w-[190px] max-w-[260px]"
    >
      {({ close }) => (
        <>
          <DropdownItem
            active={selected === null}
            onClick={() => {
              onChange(null);
              close();
            }}
          >
            All Students
          </DropdownItem>
          {students.map((s) => (
            <DropdownItem
              key={s.id}
              active={selected === s.id}
              onClick={() => {
                onChange(s.id);
                close();
              }}
            >
              {fullName(s.first_name, s.last_name, "Student")}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}
