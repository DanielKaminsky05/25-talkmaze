"use client";

export type Student = {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  lesson_space_id: string | null;
  profile_access_pin: string | null;
  teach_works_url: string | null;
  lesson_space_teacher_link: string | null;
  lesson_space_student_link: string | null;
  remaining_lessons: number | null;
};

interface StudentTableProps {
  students?: Student[];
  onStudentClick: (student: Student) => void;
}

export default function StudentTable({ students = [], onStudentClick }: StudentTableProps) {
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
              Account ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Remaining Lessons
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
                  {student.name}
                </td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">{student.id}</td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">{student.account_id}</td>
                <td className="px-4 py-3">
                  {student.remaining_lessons != null ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#B1E7D6]/10 text-[#B1E7D6]">
                      {student.remaining_lessons}
                    </span>
                  ) : (
                    <span className="text-white/25 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-white/30">
                No students found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
