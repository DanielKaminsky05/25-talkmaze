"use server";
import { ReactNode } from "react";
import Bookmarks from "../components/coach-page/Bookmarks";
import Contacts from "../components/coach-page/Contacts";
import { createClient } from "@/utils/supabase/server";

// Mock type for Contact data retrieved from database
type Contact = {
  id: string;
  name: string;
};

// Layout of Coach Page both for /coach and /coach/[conversation]
export default async function Layout({ children }: { children: ReactNode }) {
  // Contacts Array - Dummy Data to test frontend, replace once backend is implemented
  const contactsEx: Contact[] = [
    { id: "1", name: "Ghalia" },
    { id: "2", name: "Deem" },
  ];

  return (
    <div
      className="flex flex-col md:flex-row md:gap-6 h-full rounded-xl mx-2 mb-2 p-3
      lg:mb-6 min-h-[80vh]"
    >
      <div className="flex flex-col max-w-[384px] md:basis-1/3">
        {/* Contacts filter bar */}
        <Contacts contacts={contactsEx} />
        {/* Bookmarks */}
        <Bookmarks />
      </div>

      {/* 
        Display selected conversation 
        OR "select a contact from contact list" 
        */}
      <div className="flex flex-1">{children}</div>
    </div>
  );
}

async function getAccounts() {
  const supabase = await createClient();
}
