import { redirect } from "next/navigation";
import CoachPageClient from "../../CoachPageClient";
import { getCoachDashboardContext } from "@/src/lib/coach/server/getCoachDashboardContext";

interface CoachStudentDashboardPageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{
    notice?: string;
    openChat?: string;
  }>;
}

type ChatTarget = "student" | "parent" | null;

function parseChatTarget(value: string | undefined): ChatTarget {
  if (value === "student" || value === "parent") return value;
  return null;
}

export default async function CoachStudentDashboardPage({
  params,
  searchParams,
}: CoachStudentDashboardPageProps) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
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
        activeTab="details"
      />
    );
  }

  const selectedStudent = students.find((student) => student.id === studentId);
  if (!selectedStudent) {
    redirect(`/coach/students/${students[0].id}?notice=student-unavailable`);
  }

  return (
    <CoachPageClient
      currentUserId={account.id}
      currentUserEmail={account.email}
      selectedStudent={selectedStudent}
      assignedStudents={students}
      selectedStudentId={selectedStudent.id}
      selectionNotice={query.notice ?? null}
      initialOpenChatTarget={parseChatTarget(query.openChat)}
      activeTab="details"
    />
  );
}
