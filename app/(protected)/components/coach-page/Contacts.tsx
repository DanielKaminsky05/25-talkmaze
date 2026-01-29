"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactsList from "./contact-list/ContactsList";
import ContactsFilterInput from "./contact-list/ContactsFilterInput";
import { Contact } from "@/lib/types/contact";

/**
 * This component renders the contact filter bar and the contact list
 * @param param0 Array of contacts to display when filter bar is focused
 */
export default function Contacts({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleContactClick = (contactId: string) => {
    router.push(`/coach/${contactId}`);
  };

  return (
    <div className="relative">
      {/* Dim overlay when filter is focused */}
      {isFocused && (
        <div
          className="fixed inset-0 bg-black/30 pointer-events-none"
          aria-hidden="true"
        />
      )}
      {/* Raise z-index for the input and dropdown so they sit above the overlay */}
      <div className="relative z-20">
        <ContactsFilterInput
          value={filter}
          onChange={setFilter}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Contacts list, only display when filter bar is focused*/}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1">
            <ContactsList
              contacts={contacts}
              filter={filter}
              onContactClick={handleContactClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
