"use client";
import Link from "next/link";
import { Contact } from "@/src/lib/messaging/types";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/src/components/ui/avatar";

export type ContactsListProps = {
  contacts?: Contact[];
  filter?: string;
  /** Route prefix a contact links to: `${basePath}/${contact.id}`. */
  basePath?: string;
  onContactClick?: (contactId: string) => void;
};

export default function ContactsList({
  contacts = [],
  filter = "",
  basePath = "/message",
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
          href={`${basePath}/${c.id}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onContactClick?.(c.id);
          }}
          className="flex items-center w-full h-13 px-3 py-1.5
                     rounded-lg bg-white cursor-pointer"
        >
          <Avatar size="sm" shape="square" variant="navy" className="h-full">
            <AvatarImage src={c.avatar_url} alt={c.name} sizes="36px" />
            <AvatarFallback />
          </Avatar>
          <p className="ml-3 text-[#1f2e3b]">{c.name}</p>
        </Link>
      ))}
    </div>
  );
}
