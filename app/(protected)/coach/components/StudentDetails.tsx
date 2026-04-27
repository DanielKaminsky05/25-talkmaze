"use client";

import { useState, useEffect } from "react";
import { ConversationClient } from "@/app/(protected)/message/[id]/_client";
import StudentAvatar from "./student-details/StudentAvatar";
import StudentSchedule from "./student-details/StudentSchedule";
import type { Database } from "@/services/supabase/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

interface StudentDetailsProps {
  student: Student | null;
  currentUserId: string;
  currentUserEmail: string;
  autoOpenChat?: string | null;
}

type ChatTarget = "student" | "parent" | null;

export default function StudentDetails({
  student,
  currentUserId,
  currentUserEmail,
  autoOpenChat,
}: StudentDetailsProps) {
  const [activeChat, setActiveChat] = useState<ChatTarget>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Reset state when student changes
  useEffect(() => {
    setActiveChat(null);
    setConversationId(null);
    setMessages([]);
    setSessions([]);
  }, [student?.id]);

  // Auto-open student chat when triggered from the students list
  useEffect(() => {
    if (autoOpenChat && autoOpenChat === student?.id && !activeChat) {
      openChat("student");
    }
  }, [autoOpenChat, student?.id]);

  // Fetch student schedule
  useEffect(() => {
    if (!student) return;
    setLoadingSchedule(true);
    fetch(`/api/admin/students`)
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((data) => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoadingSchedule(false));
  }, [student?.id]);

  async function openChat(type: "student" | "parent") {
    // Toggle off if same chat is already open
    if (activeChat === type) {
      setActiveChat(null);
      return;
    }

    if (!student) return;

    setLoadingChat(true);
    try {
      let clientId = student.id;

      if (type === "parent") {
        const parentRes = await fetch(`/api/parent/students/${student.id}`);
        if (!parentRes.ok) throw new Error("Could not fetch parent");
        const { id } = await parentRes.json();
        clientId = id;
      }

      const convRes = await fetch(
        `/api/coach/conversation?contactId=${clientId}`,
      );
      if (!convRes.ok) throw new Error("Failed to load conversation");
      const { conversationId: convId } = await convRes.json();

      const msgsRes = await fetch(
        `/api/coach/conversation/message?conversationId=${convId}`,
      );
      const msgs = msgsRes.ok ? await msgsRes.json() : [];

      setConversationId(convId);
      setMessages(msgs);
      setActiveChat(type);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  }

  // Empty state — no student selected
  if (!student) {
    return (
      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm flex items-center justify-center min-h-[480px] p-8">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-[#2B4257]/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#2B4257"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            No student selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a student from the list to view their details.
          </p>
        </div>
      </div>
    );
  }

  const fullName =
    `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
    "Unnamed Student";

  return (
    <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm min-h-[480px] flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <h2 className="text-base font-semibold text-[#2B4257]">
          Student Details
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openChat("student")}
            disabled={loadingChat}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
              activeChat === "student"
                ? "bg-[#2B4257] text-white"
                : "border border-[#2B4257]/25 text-[#2B4257] hover:bg-[#2B4257]/5"
            }`}
          >
            {activeChat === "student"
              ? "Hide Chat"
              : loadingChat
                ? "Loading..."
                : "Message Student"}
          </button>
          <button
            onClick={() => openChat("parent")}
            disabled={loadingChat}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
              activeChat === "parent"
                ? "bg-[#2B4257] text-white"
                : "border border-[#2B4257]/25 text-[#2B4257] hover:bg-[#2B4257]/5"
            }`}
          >
            {activeChat === "parent"
              ? "Hide Chat"
              : loadingChat
                ? "Loading..."
                : "Message Parent"}
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeChat && conversationId ? (
          <ConversationClient
            conversation={{ id: conversationId }}
            user={{ id: currentUserId, name: currentUserEmail }}
            messages={messages}
          />
        ) : (
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Student header */}
            <div className="flex items-center gap-4 mb-6">
              <StudentAvatar
                firstName={student.first_name}
                lastName={student.last_name}
              />
              <h3 className="text-xl font-bold text-gray-900">{fullName}</h3>
            </div>

            {/* Schedule section */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h4 className="text-sm font-semibold text-[#2B4257] mb-4">
                Upcoming Schedule
              </h4>
              <StudentSchedule
                sessions={sessions}
                loading={loadingSchedule}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
