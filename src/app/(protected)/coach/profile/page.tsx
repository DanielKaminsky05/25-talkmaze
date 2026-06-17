import { redirect } from "next/navigation";
import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import CoachProfilePageClient from "./_components/CoachProfilePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

export default async function CoachProfilePage() {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("account")
    .select("email")
    .eq("id", user.id)
    .single();

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, first_name, last_name, avatar_url, bio, location, specialty",
    )
    .eq("account_id", user.id)
    .single();

  if (!coach) redirect("/coach");

  return (
    <CoachProfilePageClient
      coach={coach}
      accountEmail={account?.email ?? user.email ?? ""}
    />
  );
}
