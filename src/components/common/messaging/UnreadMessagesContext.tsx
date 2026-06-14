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
import type { UnreadState } from "@/src/lib/messaging/actions/getUnreadState";

type UnreadMessagesContextValue = {
  unreadCount: number;
  /**
   * Per-contact unread counts, keyed by `Contact.id` (coach account id for the
   * family view; family profile id for the coach view). Only contacts with at
   * least one unread message are present.
   */
  unreadByContact: Record<string, number>;
  /**
   * Register (or clear with `null`) the conversation currently open in the
   * chatbox. Messages arriving in that conversation are on screen, so the
   * provider marks them read instead of counting them as unread.
   */
  setOpenConversation: (conversationId: string | null) => void;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextValue>({
  unreadCount: 0,
  unreadByContact: {},
  setOpenConversation: () => {},
});

/**
 * Holds the total unread-message count for the viewer (a family profile or a
 * coach) and keeps it live.
 *
 * Realtime is driven by a single per-viewer "inbox" channel (`topic`): one
 * channel regardless of how many conversations the viewer has, so the sidebar
 * never grows the realtime channel count. When the other party sends a message
 * the DB trigger pings this channel and we refetch via `fetchUnread`.
 *
 * The provider is audience-agnostic: callers pass the inbox `topic`
 * (`profile:<type>:<id>:unread` or `coach:<accountId>:unread`) and a
 * `fetchUnread` server action that returns the authoritative counts.
 */
export function UnreadMessagesProvider({
  initialUnread,
  initialUnreadByContact,
  topic,
  fetchUnread,
  children,
}: {
  initialUnread: number;
  initialUnreadByContact: Record<string, number>;
  topic: string | null;
  fetchUnread: () => Promise<UnreadState>;
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [unreadByContact, setUnreadByContact] = useState(
    initialUnreadByContact,
  );

  /** Fetches the authoritative unread counts and pushes them into state. */
  const refetch = useCallback(() => {
    fetchUnread()
      .then(({ total, byContact }) => {
        setUnreadCount(total);
        setUnreadByContact(byContact);
      })
      .catch((err) => console.error("Failed to refresh unread count:", err));
  }, [fetchUnread]);

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

  // Subscribe to the viewer's inbox channel. Refetch on mount/topic change
  // (keeps the count correct across profile switches) and on each ping.
  useEffect(() => {
    if (!topic) return;

    refetch();

    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancel = false;

    supabase.realtime
      .setAuth()
      .then(() => {
        if (cancel) return;

        channel = supabase.channel(topic, {
          config: { private: true },
        });

        // Refetch number of unread messages on channel pings
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
  }, [topic, refetch]);

  return (
    <UnreadMessagesContext.Provider
      value={{ unreadCount, unreadByContact, setOpenConversation }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
