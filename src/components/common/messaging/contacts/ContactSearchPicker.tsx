"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactsList from "./ContactsList";
import ContactsFilterInput from "./ContactsFilterInput";
import { Contact } from "@/src/lib/messaging/types";

/**
 * Search field whose focus reveals a filterable dropdown of contacts; picking
 * one navigates to that conversation. Composes `ContactsFilterInput` (input)
 * and `ContactsList` (the results).
 *
 * @param contacts Contacts to display when the filter bar is focused
 * @param basePath Route prefix a contact navigates to (`${basePath}/${id}`).
 *   Defaults to the families `/message`; the coach passes `/coach/message`.
 */
export default function ContactSearchPicker({
  contacts,
  basePath = "/message",
}: {
  contacts: Contact[];
  basePath?: string;
}) {
  const [filter, setFilter] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleContactClick = (contactId: string) => {
    router.push(`${basePath}/${contactId}`);
  };

  return (
    <div className="relative">
      {/* Overlay */}
      {isFocused && <div className="fixed inset-0 bg-black/30 z-10" />}

      <div className="relative z-20">
        <ContactsFilterInput
          value={filter}
          onChange={setFilter}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
        />

        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <ContactsList
              contacts={contacts}
              filter={filter}
              basePath={basePath}
              onContactClick={handleContactClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
