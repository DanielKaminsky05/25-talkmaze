"use client";
import Link from "next/link";
import { Contact } from "@/src/lib/messaging/types";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { useUnread } from "../../_context/UnreadContext";

/**
 * Contacts that currently have unread messages.
 * Reads the live per-contact unread map from the unread context, so rows
 * appear/update in realtime and drop off once their conversation is opened
 * (marked read). Renders nothing when there is no unread message.
 */
export default function UnreadContacts({ contacts }: { contacts: Contact[] }) {
  const { unreadByContact } = useUnread();

  const unread = contacts
    .map((c) => ({ contact: c, count: unreadByContact[c.id] ?? 0 }))
    .filter((row) => row.count > 0);

  if (unread.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {unread.map(({ contact: c, count }) => (
        <Link
          key={c.id}
          href={`/message/${c.id}`}
          className="flex items-center w-full h-13 px-3 py-1.5
                     rounded-lg bg-white cursor-pointer"
        >
          <Avatar size="sm" shape="square" variant="navy" className="h-full">
            <AvatarImage
              src={c.avatar_url}
              alt={displayName(c)}
              sizes="36px"
            />
            <AvatarFallback />
          </Avatar>
          <p className="ml-3 text-card truncate">{displayName(c)}</p>
          <Badge
            variant="primary"
            shape="circle"
            size="md"
            className="ml-auto"
            aria-label={`${count} unread`}
          >
            {count > 9 ? "9+" : count}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

/**
 * `Contact.name` is built as `"Display Name (email)"`; show just the display
 * name in the unread row (the email is search-disambiguation noise here).
 */
function displayName(c: Contact): string {
  return c.name.replace(` (${c.email})`, "");
}
