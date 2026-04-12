import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import ParentProfilePageClient from "./_components/ParentProfilePageClient";

/**
 * Parent profile page server component
 */
export default async function ParentProfilePage() {
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

  // Use the active profile cookie to load the correct parent profile
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("active_profile_id")?.value;

  if (!activeProfileId) redirect("/profiles");

  const { data: parent } = await supabase
    .from("parents")
    .select(
      "id, first_name, last_name, billing_email, phone_number, profile_access_pin, avatar_url, bio, location",
    )
    .eq("id", activeProfileId)
    .eq("account_id", user.id) // security: confirm profile belongs to the user
    .single();

  if (!parent) redirect("/profiles");

  return (
    <ParentProfilePageClient
      parent={parent}
      accountEmail={account?.email ?? user.email ?? ""}
    />
  );
}
