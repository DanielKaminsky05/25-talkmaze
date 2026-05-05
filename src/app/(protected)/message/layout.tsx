"use server";
import { ReactNode } from "react";
import Bookmarks from "./_components/Bookmarks";
import Contacts from "./_components/Contacts";
import { createClient } from "@/src/services/supabase/server";
import { Contact } from "@/src/lib/types/contact";
import { getCurrentUser } from "@/src/services/supabase/lib/getCurrentUser";

// Layout of Coach Page both for /coach and /coach/[conversation]
export default async function Layout({ children }: { children: ReactNode }) {
  // Retrieve contacts from supabase, and pass them as props to Contact list
  const contacts: Contact[] = await getContacts();

  return (
    <div
      className="flex flex-col md:flex-row md:gap-6 h-full 
      rounded-xl p-8"
    >
      <div className="flex flex-col max-w-[384px] md:basis-1/3">
        {/* Contacts filter bar*/}
        <Contacts contacts={contacts} />
        {/* Bookmarks */}
        <Bookmarks />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Fetch all coach accounts (role=2) as contacts. Display name is "Name (email)". */
async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("account")
    .select("id, email")
    .neq("id", user.id)
    .eq("role", 2)
    .order("email");

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }

  const coachAccountIds = data.map((a) => a.id);

  const { data: coaches } =
    coachAccountIds.length > 0
      ? await supabase
        .from("coaches")
        .select("account_id, first_name, last_name")
        .in("account_id", coachAccountIds)
      : { data: [] as { account_id: string; first_name: string | null; last_name: string | null }[] };

  const coachNameMap = new Map(
    (coaches ?? []).map((c) => [
      c.account_id,
      `${c.first_name || ""} ${c.last_name || ""}`.trim() || null,
    ]),
  );

  return data.map((acc) => {
    const displayName = coachNameMap.get(acc.id) ?? acc.email;
    return {
      id: acc.id,
      name: `${displayName} (${acc.email})`,
      email: acc.email,
    };
  });
}
