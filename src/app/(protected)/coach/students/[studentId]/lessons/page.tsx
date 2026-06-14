import { notFound } from "next/navigation";
import LessonsTable from "../../../_components/LessonsTable";
import { getCoachDashboardContext } from "../../../_lib/getCoachDashboardContext";
import { fullName } from "@/src/utils/formatName";

interface CoachStudentLessonsPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function CoachStudentLessonsPage({
  params,
}: CoachStudentLessonsPageProps) {
  const { studentId } = await params;
  const { students } = await getCoachDashboardContext();
  const student = students.find((s) => s.id === studentId);
  if (!student) notFound();

  return (
    <div className="min-h-0 flex-1">
      <LessonsTable
        studentId={student.id}
        studentName={fullName(student.first_name, student.last_name)}
      />
    </div>
  );
}
