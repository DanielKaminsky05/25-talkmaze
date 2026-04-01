"use server";
import { ReactNode } from "react";
import Bookmarks from "../components/coach-page/Bookmarks";
import Contacts from "../components/coach-page/Contacts";
import { createClient } from "@/utils/supabase/server";
import { Contact } from "@/lib/types/contact";
import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";

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

/**
 * Fetch contacts visible to the current user.
 * - Regular users (role=1): only see coaches (role=2) and admins (role=3)
 * - Coaches/admins: non-student accounts as-is; student accounts expanded to
 *   one entry per student profile so each profile gets a distinct conversation.
 * Display name is formatted as "Name (email)" where Name is the coach/profile name.
 */
async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  // Get current user's role
  const { data: currentAccount } = await supabase
    .from("account")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("account")
    .select("id, email, tw_customer_id, role")
    .neq("id", user.id)
    .order("email");

  // Regular users can only message coaches and admins
  if (currentAccount?.role === 1) {
    query = query.in("role", [2, 3]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }

  // Fetch coach names for all coach accounts in one query
  const coachAccountIds = data.filter((a) => a.role === 2).map((a) => a.id);

  const { data: coaches } =
    coachAccountIds.length > 0
      ? await supabase
          .from("coaches")
          .select("account_id, name")
          .in("account_id", coachAccountIds)
      : { data: [] as { account_id: string; name: string }[] };

  const coachNameMap = new Map(
    (coaches ?? []).map((c) => [c.account_id, c.name]),
  );

  // For coaches/admins: expand student accounts into one contact per profile
  if (currentAccount?.role !== 1) {
    const studentAccountIds = data.filter((a) => a.role === 1).map((a) => a.id);
    const emailMap = new Map(data.map((a) => [a.id, a.email]));

    const { data: studentProfiles } =
      studentAccountIds.length > 0
        ? await supabase
            .from("students")
            .select("id, name, account_id")
            .in("account_id", studentAccountIds)
            .order("name")
        : { data: [] as { id: string; name: string; account_id: string }[] };

    const nonStudentContacts = data
      .filter((a) => a.role !== 1)
      .map((acc) => {
        const displayName = coachNameMap.get(acc.id) ?? acc.email;
        return {
          id: acc.id,
          name: `${displayName} (${acc.email})`,
          email: acc.email,
          tw_customer_id: acc.tw_customer_id || "",
        };
      });

    const studentContacts = (studentProfiles ?? []).map((s) => ({
      id: s.id,
      name: `${s.name} (${emailMap.get(s.account_id) ?? ""})`,
      email: emailMap.get(s.account_id) ?? "",
      tw_customer_id: "",
    }));

    return [...nonStudentContacts, ...studentContacts];
  }

  return data.map((acc) => {
    const displayName = coachNameMap.get(acc.id) ?? acc.email;
    return {
      id: acc.id,
      name: `${displayName} (${acc.email})`,
      email: acc.email,
      tw_customer_id: acc.tw_customer_id || "",
    };
  });
}
