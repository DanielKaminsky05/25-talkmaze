import type { Database } from "@/services/supabase/types/database"

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface AssignCourseModalProps {
  student: Student;
  courses: Course[];
  setIsAssigningCourse: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AssignCourseModal({
  student,
  courses,
  setIsAssigningCourse,
}: AssignCourseModalProps) {
  const studentName =
    `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
    "this student";

  async function assignStudent(course: Course) {
    const res = await fetch("/api/admin/courses/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, courseId: course.id }),
    });

    if (res.ok) {
      alert(
        `Successfully assigned "${course.title}" to ${studentName}.`,
      );
      setIsAssigningCourse(false);
    } else {
      alert("Failed to assign course. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => setIsAssigningCourse(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#2B4257]">
              Assign Course
            </h2>
            <p className="text-xs text-[#2B4257]/60 mt-0.5">
              Select a course for {studentName}
            </p>
          </div>
          <button
            onClick={() => setIsAssigningCourse(false)}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Course list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              No courses available.
            </p>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-[#2B4257]/10 p-4 hover:border-[#2B4257]/25 hover:shadow-sm transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {course.description || "No description provided."}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(course.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => assignStudent(course)}
                  className="mt-3 w-full bg-[#2B4257] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#2B4257]/80 transition-colors"
                >
                  Assign This Course
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
