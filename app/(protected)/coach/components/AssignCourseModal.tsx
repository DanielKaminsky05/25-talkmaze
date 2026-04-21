import { SetStateAction, useEffect } from "react"
import type { Database } from "@/database"

type Course = Database['public']['Tables']['courses']['Row']
type Student = Database['public']['Tables']['students']['Row']
type props = {
    student: Student,
    courses: Course[],
    setIsAssigningCourse: React.Dispatch<React.SetStateAction<boolean>>
}


export default function AssignCourseModal({student, courses, setIsAssigningCourse}: props){
    async function assignStudent(course: Course){
         const response = await fetch("/api/admin/courses/assign", {
         method: "POST",
         headers: {
          "Content-Type": "application/json",
         },
         body: JSON.stringify({
          studentId: student.id,
          courseId: course.id,
         }),

       });

       if(response.ok){
            alert('Successfully assigned ' + student.first_name + ' '  + student.last_name + ' to ' + course.title);
       }

    }
    
    return (
    <div className="p-4">
        <div className = 'flex flex-row justify-center gap-3 p-5'>
            <h2 className="text-xl font-semibold">Assigning Course</h2>

            <button
                className="bg-red-500 text-white text-sm px-3 py-1 rounded-md hover:bg-red-600 transition"
                onClick = {() => setIsAssigningCourse(false)}
            >
                    Exit
            </button>
        </div>
      
        <div className="grid grid-cols-1 gap-4 ">
            {courses.map((course) => {
            return (
            <div
                key={course.id}
                className="bg-white rounded-2xl shadow-md p-4 border hover:shadow-lg transition cursor-pointer"
            >
            {/* Course Name */}
            <h3 className="text-lg font-bold text-gray-800">
                {course.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 mt-1">
                {course.description || "No description provided"}
            </p>

            {/* Metadata */}
            <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(course.created_at).toLocaleDateString()}</p>
                {course.head_lesson_id && (
                <p>Has lessons</p>
                )}
            </div>

            {/* Action */}
            <button 
                className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                onClick = {() => assignStudent(course)}
            >
                Assign Course
            </button>
            </div>
      );
    })}
  </div>
</div>
    )
}