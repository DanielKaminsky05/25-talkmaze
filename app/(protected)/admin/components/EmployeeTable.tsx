import { Coach } from "./AssignStudentDropDown";

interface EmployeeTableProps {
  employees: Coach[];
  onEmployeeClick: (employee: Coach) => void;
}

export default function EmployeeTable({ employees, onEmployeeClick }: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#2B4257]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Name
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Coach ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Account ID
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest">
              Joined
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {employees.length > 0 ? (
            employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => onEmployeeClick(employee)}
                className="hover:bg-[#2B4257]/60 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 text-sm text-white font-medium group-hover:text-[#B1E7D6] transition-colors">
                  {employee.first_name} {employee.last_name}
                </td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">{employee.id}</td>
                <td className="px-4 py-3 text-sm text-white/60 font-mono">{employee.account_id}</td>
                <td className="px-4 py-3 text-sm text-white/40">
                  {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-white/30">
                No coaches found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
