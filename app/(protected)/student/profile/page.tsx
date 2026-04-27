import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/services/supabase/server";
import StudentProfilePageClient from "./_components/StudentProfilePageClient";

/**
 * Student profile page server component
 */
export default async function StudentProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the account's login email (read-only on this page)
  const { data: account } = await supabase
    .from("account")
    .select("email")
    .eq("id", user.id)
    .single();

  // Use the active profile cookie to load the correct student profile
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("active_profile_id")?.value;

  if (!activeProfileId) redirect("/profiles");

  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, avatar_url, bio, location, grade, date_of_birth")
    .eq("id", activeProfileId)
    .eq("account_id", user.id) // security: confirm profile belongs to the user
    .single();

  if (!student) redirect("/profiles");

  return (
    <StudentProfilePageClient
      student={student}
      accountEmail={account?.email ?? user.email ?? ""}
    />
  );
}
