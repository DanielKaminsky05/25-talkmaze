"use client";
import Link from "next/link";
import Image from "next/image";
import { Contact } from "@/src/lib/messaging/types";

export type ContactsListProps = {
  contacts?: Contact[];
  filter?: string;
  onContactClick?: (contactId: string) => void;
};

export default function ContactsList({
  contacts = [],
  filter = "",
  onContactClick,
}: ContactsListProps) {
  const filterString = filter.trim().toLowerCase();
  const visible = filterString
    ? contacts.filter((c) => c.name.toLowerCase().includes(filterString))
    : contacts;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((c) => (
        <Link
          key={c.id}
          href={`/message/${c.id}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onContactClick?.(c.id);
          }}
          className="flex items-center w-full h-13 px-3 py-1.5
                     rounded-lg bg-white cursor-pointer"
        >
          <div className="relative bg-[#1F2E3B] h-full w-9 rounded-md flex justify-center items-center overflow-hidden">
            {c.avatar_url ? (
              <Image
                src={c.avatar_url}
                alt={c.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B1E7D6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
          </div>
          <p className="ml-3 text-[#1f2e3b]">{c.name}</p>
        </Link>
      ))}
    </div>
  );
}

{
  /* Unread messages */
}
{
  /* <div
            className="w-6 h-6 rounded-full border-2 border-[#1F2E3B]
           text-[#1F2E3B] text-center ml-auto"
          >
            1
          </div> */
}
