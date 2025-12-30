"use client";
import { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactsListBase from "../components/coach-page/contact-list/ContactsList";
import type { FC } from "react";
import ContactsFilterInput from "../components/coach-page/contact-list/ContactsFilterInput";

// Mock type for Contact data retrieved from database
type Contact = {
  id: number;
  displayName: string;
};

// Mock type for Conversation retrieved from database
type Conversation = {};

// Layout of Coach Page both for /coach and /coach/[conversation]
export default function Layout({ children }: { children: ReactNode }) {
  //State variables
  const [filter, setFilter] = useState(""); // Filter contacts value
  const [isFocused, setIsFocused] = useState(false); // Track input focus state
  const router = useRouter();
  const ContactsList = ContactsListBase as FC<{
    contacts: Contact[];
    filter: string;
    onContactClick?: (contactId: number) => void;
  }>;

  // Contacts Array - Dummy Data to test frontend, replace once backend is implemented
  const mockContacts: Contact[] = [
    { id: 1, displayName: "Ghalia" },
    { id: 2, displayName: "Deem" },
  ];

  const handleContactClick = (contactId: number) => {
    router.push(`/coach/${contactId}`);
  };

  return (
    <div
      className="flex flex-col md:flex-row md:gap-6 h-full rounded-xl mx-2 mb-2 p-3
      lg:mb-6 min-h-[80vh]"
    >
      <div className="flex flex-col max-w-[384px] md:basis-1/3">
        {/* Filter contacts */}
        <div className="relative">
          <ContactsFilterInput
            value={filter}
            onChange={setFilter}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {/* Contacts list */}
          {isFocused && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1">
              <ContactsList
                contacts={mockContacts}
                filter={filter}
                onContactClick={handleContactClick}
              />
            </div>
          )}
        </div>
        {/* Bookmarks */}
        <div
          className="max-h-[287px] p-4 hidden md:flex flex-col md:mt-23 grow
           bg-[#B1E7D6] rounded-xl"
        >
          <div className="flex">
            <h2 className="">Bookmarks</h2>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M8.57059 5.14307H15.4277C15.7308 5.14307 16.0215 5.26347 16.2359 5.4778C16.4502 5.69213 16.5706 5.98282 16.5706 6.28592V20.0002L11.9992 15.4288L7.42773 20.0002V6.28592C7.42773 5.98282 7.54814 5.69213 7.76247 5.4778C7.9768 5.26347 8.26749 5.14307 8.57059 5.14307Z"
                fill="#1F2E3B"
                stroke="#1F2E3B"
                strokeWidth="1.14286"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Chat Box */}
        {children}
      </div>
    </div>
  );
}
