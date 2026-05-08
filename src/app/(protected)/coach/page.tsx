import { redirect } from "next/navigation";
import CoachPageClient from "./CoachPageClient";
import { getCoachDashboardContext } from "@/src/lib/coach/server/getCoachDashboardContext";

export default async function CoachPage() {
  const { account, students } = await getCoachDashboardContext();

  if (students.length > 0) {
    redirect(`/coach/students/${students[0].id}`);
  }

  return (
    <CoachPageClient
      currentUserId={account.id}
      currentUserEmail={account.email}
      selectedStudent={null}
      assignedStudents={students}
      selectedStudentId={null}
      selectionNotice={null}
      initialOpenChatTarget={null}
    />
  );
}
