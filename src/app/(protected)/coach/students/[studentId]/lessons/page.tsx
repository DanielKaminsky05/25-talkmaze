import { redirect } from "next/navigation";
import CoachPageClient from "../../../CoachPageClient";
import { getCoachDashboardContext } from "@/src/lib/coach/server/getCoachDashboardContext";

interface CoachStudentLessonsPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function CoachStudentLessonsPage({
  params,
}: CoachStudentLessonsPageProps) {
  const { studentId } = await params;
  const { account, students } = await getCoachDashboardContext();

  if (students.length === 0) {
    return (
      <CoachPageClient
        currentUserId={account.id}
        currentUserEmail={account.email}
        selectedStudent={null}
        assignedStudents={students}
        selectedStudentId={null}
        selectionNotice={null}
        initialOpenChatTarget={null}
        activeTab="lessons"
      />
    );
  }

  const selectedStudent = students.find((s) => s.id === studentId);
  if (!selectedStudent) {
    redirect(`/coach/students/${students[0].id}/lessons`);
  }

  return (
    <CoachPageClient
      currentUserId={account.id}
      currentUserEmail={account.email}
      selectedStudent={selectedStudent}
      assignedStudents={students}
      selectedStudentId={selectedStudent.id}
      selectionNotice={null}
      initialOpenChatTarget={null}
      activeTab="lessons"
    />
  );
}
