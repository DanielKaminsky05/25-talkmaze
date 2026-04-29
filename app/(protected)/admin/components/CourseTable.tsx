import { Course } from "./types";

interface CourseTableProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
}

export default function CourseTable({ courses, onCourseClick }: CourseTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#2B4257]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Name
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Course ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {courses.length > 0 ? (
            courses.map((course) => (
              <tr
                key={course.id}
                onClick={() => onCourseClick(course)}
                className="hover:bg-[#2B4257]/60 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 text-sm text-white font-medium group-hover:text-[#B1E7D6] transition-colors">
                  {course.name}
                </td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">{course.id}</td>
                <td className="px-4 py-3 text-sm text-white/40 max-w-xs truncate">
                  {course.description || "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-sm text-white/30">
                No courses found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
