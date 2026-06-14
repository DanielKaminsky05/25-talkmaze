import { notFound } from "next/navigation";
import CoursesPanel from "./_components/CoursesPanel";
import { getCoachDashboardContext } from "../../../_lib/getCoachDashboardContext";

interface CoursesPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function CoachStudentCoursesPage({
  params,
}: CoursesPageProps) {
  const { studentId } = await params;
  const { students } = await getCoachDashboardContext();
  const student = students.find((s) => s.id === studentId);
  if (!student) notFound();

  return <CoursesPanel student={student} />;
}
