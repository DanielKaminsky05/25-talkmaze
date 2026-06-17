import { notFound } from "next/navigation";
import LessonsTable from "../../../_components/LessonsTable";
import { getCoachDashboardContext } from "../../../_lib/getCoachDashboardContext";
import { fullName } from "@/src/utils/formatName";
import type { Metadata } from "next";

interface CoachStudentLessonsPageProps {
  params: Promise<{ studentId: string }>;
}

export async function generateMetadata({
  params,
}: CoachStudentLessonsPageProps): Promise<Metadata> {
  const { studentId } = await params;
  try {
    const { students } = await getCoachDashboardContext();
    const student = students.find((s) => s.id === studentId);
    if (!student) return { title: "Lessons" };
    return {
      title: `${fullName(student.first_name, student.last_name, "Student")} — Lessons`,
    };
  } catch {
    return { title: "Lessons" };
  }
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
