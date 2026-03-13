import { TeachworksStudent } from "@/lib/teachworks/types";

interface StudentTableProps {
  students: TeachworksStudent[];
  onStudentClick: (student: TeachworksStudent) => void;
}

export default function StudentTable({ students, onStudentClick }: StudentTableProps) {
  return (
    <div className="overflow-x-auto shadow rounded">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">First Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Last Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Student ID</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Customer ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {students.length > 0 ? (
            students.map((student) => (
              <tr 
                key={student.id} 
                onClick={() => onStudentClick(student)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{student.first_name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{student.last_name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{student.id}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{student.customer_id}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-3 py-2 text-center text-xs text-gray-500">
                No students found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
