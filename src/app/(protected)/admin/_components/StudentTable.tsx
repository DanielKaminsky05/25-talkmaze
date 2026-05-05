"use client";

export type Student = {
  id: string;
  account_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  date_of_birth: string | null;
  grade: string | null;
  lesson_space_id: string | null;
  lesson_space_student_link: string | null;
  lesson_space_teacher_link: string | null;
  location: string | null;
  notes: string | null;
  post_lesson_days: number | null;
  post_lesson_tasks_enabled: boolean | null;
  webhook_room_id: string | null;
};

interface StudentTableProps {
  students?: Student[];
  onStudentClick: (student: Student) => void;
}

export default function StudentTable({
  students = [],
  onStudentClick,
}: StudentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#2B4257]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Name
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Student ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Grade
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {students.length > 0 ? (
            students.map((student) => (
              <tr
                key={student.id}
                onClick={() => onStudentClick(student)}
                className="hover:bg-[#2B4257]/60 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 text-sm text-white font-medium group-hover:text-[#B1E7D6] transition-colors">
                  {[student.first_name, student.last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">
                  {student.id}
                </td>
                <td className="px-4 py-3 text-sm text-white/60">
                  {student.grade ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white/60">
                  {student.location ?? "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-sm text-white/30"
              >
                No students found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
