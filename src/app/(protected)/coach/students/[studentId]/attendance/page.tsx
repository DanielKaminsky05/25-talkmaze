import { notFound } from "next/navigation";
import AttendancePanel from "../../../_components/student-details/AttendancePanel";
import { getCoachDashboardContext } from "../../../_lib/getCoachDashboardContext";

interface AttendancePageProps {
  params: Promise<{ studentId: string }>;
}

export default async function CoachStudentAttendancePage({
  params,
}: AttendancePageProps) {
  const { studentId } = await params;
  const { students } = await getCoachDashboardContext();
  const student = students.find((s) => s.id === studentId);
  if (!student) notFound();

  return (
    <AttendancePanel
      studentId={student.id}
      firstName={student.first_name}
      lastName={student.last_name}
    />
  );
}
