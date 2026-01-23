"use client";

import { sendMessage } from "@/utils/supabase/actions/messages";
import { FormEvent, useState } from "react";

export default function ConversationMessageInput({
  conversationId,
}: {
  conversationId: string;
}) {
  // State variables from controlled form elements
  const [message, setMessage] = useState("");

  // Handle message submission
  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    // Trim message before attempting to send. If message is empty after
    // trim, do nothing
    const text = message.trim();
    if (!message) return;

    setMessage(""); // Set the input field to empty

    // Invoke server action to send message
    const result = await sendMessage({ text, conversationId });

    // Check if message was successfully sent
    // TODO: display error message on client if there is erro
    if (result.error) {
      console.log("ConversationMessageInput ERROR:" + result.message);
    } else {
      // TODO: handle success
    }
  }

  return (
    <form
      className="flex justify-between items-center h-15 p-2 mt-auto 
    rounded-[9px] bg-white"
      onSubmit={handleSubmit}
    >
      {/* File attachment input (dummy) - TODO: implement file transfer */}
      <input type="file" id="file-input" className="hidden" />
      <label
        htmlFor="file-input"
        className="cursor-pointer flex items-center justify-center px-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="23"
          viewBox="0 0 22 23"
          fill="none"
        >
          <path
            d="M20.4383 10.6622L11.2483 19.8522C10.1225 20.9781 8.59552 21.6106 7.00334 21.6106C5.41115 21.6106 3.88418 20.9781 2.75834 19.8522C1.63249 18.7264 1 17.1994 1 15.6072C1 14.015 1.63249 12.4881 2.75834 11.3622L11.9483 2.17222C12.6989 1.42166 13.7169 1 14.7783 1C15.8398 1 16.8578 1.42166 17.6083 2.17222C18.3589 2.92279 18.7806 3.94077 18.7806 5.00222C18.7806 6.06368 18.3589 7.08166 17.6083 7.83222L8.40834 17.0222C8.03306 17.3975 7.52406 17.6083 6.99334 17.6083C6.46261 17.6083 5.95362 17.3975 5.57834 17.0222C5.20306 16.6469 4.99222 16.138 4.99222 15.6072C4.99222 15.0765 5.20306 14.5675 5.57834 14.1922L14.0683 5.71222"
            stroke="#1F2E3B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </label>
      {/* Message text input */}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Type a message"
        className="grow"
      />
      {/* Submit button */}
      <button type="submit" className="mr-6 cursor-pointer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M22 2L11 13"
            stroke="#1F2E3B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 2L15 22L11 13L2 9L22 2Z"
            stroke="#1F2E3B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
