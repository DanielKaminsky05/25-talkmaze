"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/src/services/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getUnreadState } from "@/src/lib/messaging/actions/getUnreadState";

type UnreadContextValue = {
  unreadCount: number;
  /**
   * Per-contact unread counts, keyed by coach account id (`Contact.id`). Only
   * contacts with at least one unread message are present.
   */
  unreadByContact: Record<string, number>;
  /**
   * Register (or clear with `null`) the conversation currently open in the
   * chatbox. Messages arriving in that conversation are on screen, so the
   * provider marks them read instead of counting them as unread.
   */
  setOpenConversation: (conversationId: string | null) => void;
};

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  unreadByContact: {},
  setOpenConversation: () => {},
});

/**
 * Holds the total unread-message count for the active family profile and keeps
 * it live.
 *
 * Realtime is driven by a single per-profile "inbox" channel
 * (`profile:<type>:<id>:unread`) - one channel regardless of how many
 * conversations the user has, so the sidebar never grows the realtime channel
 * count. When a coach sends a message, the DB trigger pings this channel and
 * we refetch the total via a server action.
 *
 */
export function UnreadProvider({
  initialUnread,
  initialUnreadByContact,
  profileId,
  profileType,
  children,
}: {
  initialUnread: number;
  initialUnreadByContact: Record<string, number>;
  profileId: string | null;
  profileType: "student" | "parent";
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [unreadByContact, setUnreadByContact] = useState(
    initialUnreadByContact,
  );

  /** Fetches the total number of unread messages and push into React state */
  const refetch = useCallback(() => {
    getUnreadState()
      .then(({ total, byContact }) => {
        setUnreadCount(total);
        setUnreadByContact(byContact);
      })
      .catch((err) => console.error("Failed to refresh unread count:", err));
  }, []);

  // The conversation currently visible in the chatbox
  const openConversationRef = useRef<string | null>(null);
  const setOpenConversation = useCallback(
    (conversationId: string | null) => {
      openConversationRef.current = conversationId;
      // Opening a conversation marks it read server-side during the page
      // render that mounts the chatbox, and that commit lands before this
      // client effect runs. Refetch so the now-read conversation drops out of
      // the total and the per-contact unread map.
      if (conversationId) refetch();
    },
    [refetch],
  );

  // Subscribe to the active profile's inbox channel. Refetch on mount/profile
  // change (keeps the count correct across profile switches) and on each ping.
  useEffect(() => {
    if (!profileId) return;

    refetch();

    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancel = false;

    const topic = `profile:${profileType}:${profileId}:unread`;

    supabase.realtime
      .setAuth()
      .then(() => {
        if (cancel) return;

        channel = supabase.channel(topic, {
          config: { private: true },
        });

        // Refetch number unread messages on channel pings
        channel
          .on("broadcast", { event: "UNREAD" }, async (payload) => {
            const conversationId = payload.payload?.conversation_id as
              | string
              | undefined;

            // If the ping is for the conversation the user is actively viewing
            // the message is already on screen - mark it read first so it is
            // never counted as unread (avoids the badge briefly ticking up).
            if (
              conversationId &&
              conversationId === openConversationRef.current
            ) {
              await supabase.rpc("mark_conversation_read", {
                p_conversation_id: conversationId,
              });
            }

            refetch();
          })
          .subscribe();
      })
      .catch((err) => console.error("[unread] setAuth failed", err));

    return () => {
      cancel = true;
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
  }, [profileId, profileType, refetch]);

  return (
    <UnreadContext.Provider
      value={{ unreadCount, unreadByContact, setOpenConversation }}
    >
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
