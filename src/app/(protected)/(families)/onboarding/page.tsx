import { redirect } from "next/navigation";
import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import StudentSetupForm from "../parent/students/[studentId]/setup/_components/StudentSetupForm";

interface Props {
  searchParams: Promise<{ studentId?: string; from?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { studentId, from } = await searchParams;
  const redirectAfterSetup = from === "profiles" ? "student" : "parent";

  if (!studentId) redirect("/profiles");

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, is_setup_complete")
    .eq("id", studentId)
    .eq("account_id", user.id)
    .single();

  if (!student || student.is_setup_complete !== false) redirect("/profiles");

  return (
    <div className="w-full min-h-screen bg-[#2b4257] flex items-center justify-center py-8 px-4 overflow-y-auto">
      <StudentSetupForm
        studentId={student.id}
        firstName={student.first_name ?? ""}
        lastName={student.last_name ?? ""}
        redirectAfterSetup={redirectAfterSetup}
      />
    </div>
  );
}
