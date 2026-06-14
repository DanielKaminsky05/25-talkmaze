import { ReactNode } from "react";
import ContactSearchPicker from "@/src/components/common/messaging/contacts/ContactSearchPicker";
import UnreadContacts from "@/src/components/common/messaging/UnreadContacts";
import { getCoachContacts } from "@/src/lib/messaging/server/getCoachContacts";

const BASE_PATH = "/coach/message";

/**
 * Coach messaging layout: split-screen with the contacts panel on the left
 * (search-to-reveal over the coach's assigned students + parents, and the live
 * unread-contacts list). The conversation box on the right.
 */
export default async function CoachMessageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const contacts = await getCoachContacts();

  return (
    <div className="flex flex-col md:flex-row md:gap-6 h-full rounded-xl p-8">
      <div className="flex flex-col gap-4 max-w-[384px] md:basis-1/3">
        {/* Contacts filter bar */}
        <ContactSearchPicker contacts={contacts} basePath={BASE_PATH} />
        {/* Contacts with unread messages */}
        <UnreadContacts contacts={contacts} basePath={BASE_PATH} />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
