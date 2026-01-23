"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactsList from "./contact-list/ContactsList";
import ContactsFilterInput from "./contact-list/ContactsFilterInput";

type Contact = {
  id: string;
  name: string;
};

interface ContactsProps {
  contacts: Contact[];
}

export default function Contacts({ contacts }: ContactsProps) {
  const [filter, setFilter] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleContactClick = (contactId: string) => {
    router.push(`/coach/${contactId}`);
  };

  return (
    <div className="relative">
      <ContactsFilterInput
        value={filter}
        onChange={setFilter}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {/* Contacts list, only display when filter bar is focused*/}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1">
          <ContactsList
            contacts={contacts}
            filter={filter}
            onContactClick={handleContactClick}
          />
        </div>
      )}
    </div>
  );
}
