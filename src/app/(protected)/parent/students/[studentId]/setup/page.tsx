import { redirect } from "next/navigation";
import { createClient } from "@/src/services/supabase/server";
import StudentSetupForm from "./_components/StudentSetupForm";

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentSetupPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, is_setup_complete")
    .eq("id", studentId)
    .eq("account_id", user.id)
    .single();

  if (!student) redirect("/parent");

  // Only students from minimal signup (is_setup_complete === false) need this page
  if (student.is_setup_complete !== false) redirect("/parent");

  return (
    <div className="w-full flex justify-center py-8 px-4 overflow-y-auto">
      <StudentSetupForm
        studentId={student.id}
        firstName={student.first_name ?? ""}
        lastName={student.last_name ?? ""}
      />
    </div>
  );
}
