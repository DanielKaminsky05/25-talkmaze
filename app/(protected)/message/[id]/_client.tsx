"use client";
import { Message } from "@/utils/supabase/actions/messages";
import ConversationMessage from "../../components/coach-page/ConversationMessage";
import ConversationMessageInput from "../../components/coach-page/ConversationMessageInput";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export function ConversationClient({
    conversation,
    user,
    messages,
}: {
    conversation: {
        id: string;
    };
    user: {
        id: string;
        name: string;
    };
    messages: Message[];
}) {
    /**
     *  Initialize a realtime channel representing the conversation, and
     *  subscribe the current user to it.
     *
     *  Retrieves the users currently subscribed to the conversation channel.
     *
     *  Retrieves the latest messages each time a message is sent to the
     *  conversation channel.
     */
    const { connectedUsers, messages: realTimeMessages } = useRealtimeChat({
        roomId: conversation.id,
        userId: user.id,
    });

    const visibleMessages = messages.concat(realTimeMessages);

    return (
        <div
            className="flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden
       bg-[#c0f7e5] px-3 py-5 rounded-xl 
       shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]"
        >
            {/* Messages Display Container */}
            <div
                className="flex flex-col-reverse flex-1 min-h-0 overflow-y-auto
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] 
        [scrollbar-width:none]"
            >
                <div className="flex flex-col gap-2">
                    {visibleMessages.map((message) => (
                        <ConversationMessage key={message.id} {...message} />
                    ))}
                </div>
            </div>
            {/* Send Message Input */}
            <ConversationMessageInput conversationId={conversation.id} />
        </div>
    );
}

/**
 * Set up subscription to a Supabase realtime channel.
 * Listen to broadcasts that are triggered when a message is added to Supabase
 * messages table.
 */
function useRealtimeChat({
    roomId,
    userId,
}: {
    roomId: string;
    userId: string;
}) {
    const [connectedUsers, setConnectedUsers] = useState(1);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        const supabase = createClient();
        let newChannel: RealtimeChannel;
        let cancel = false;

        /**
         * Must wrap all the code related to supabase realtime channels with
         * supabase.realtime.setAuth().
         * This is so that superbase's realtime channels can track which user(s)
         * are subscribed to them.
         * */
        supabase.realtime.setAuth().then(() => {
            // If the use-effect hook is run on component unmount, don't do anything
            if (cancel) return;

            /**
             * Initialize an instance of a Supabase channel representing the
             * conversation between two users.
             *
             * The channel is private so only the members of the conversation can
             * listen to channel broadcasts, and send payloads to the channel
             * The channel tracks the "presence" of users by userId
             */
            newChannel = supabase.channel(`room:${roomId}:messages`, {
                config: {
                    private: false, // TODO: implement the supabase RLS so that it works with private channels
                    presence: {
                        key: userId,
                    },
                },
            });

            newChannel
                // Every time a user leaves or joins the channel, get the number of
                // users connected to the channel
                .on("presence", { event: "sync" }, () => {
                    setConnectedUsers(Object.keys(newChannel.presenceState()).length);
                })
                // Listen to inserts to supabase messages table
                .on("broadcast", { event: "INSERT" }, (payload) => {
                    const record = payload.payload;
                    console.log(payload);
                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            id: record.id,
                            text: record.text,
                            created_at: record.created_at,
                            sender_id: record.sender_id,
                            sender: {
                                name: record.sender_name,
                            },
                        },
                    ]);
                })
                // Add the current user to the channel, so that it can be tracked
                // The current user's userId is added to the list of id's stored in
                // .presenceState()
                .subscribe((status) => {
                    if (status !== "SUBSCRIBED") return;

                    newChannel.track({ userId });
                });
        });

        /** When the component unmounts (page closes, etc.), make sure to:
         *  - remove the user from presenceState()
         *  - unsubscribe the user from the channel
         */
        return () => {
            cancel = true;
            if (!newChannel) return;

            newChannel.untrack(); // Remove user from presenceState
            newChannel.unsubscribe(); // Stop listening to channel broadcasts
        };
    }, [roomId, userId]); // Run useEffect hook whenever roomId or userId changes

    return { connectedUsers, messages };
}