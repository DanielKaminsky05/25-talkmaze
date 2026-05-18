"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { fullName } from "@/src/utils/formatName";
import { ConversationClient } from "@/src/app/(protected)/(families)/message/[id]/_client";
import StudentAvatar from "./student-details/StudentAvatar";
import StudentSchedule from "./student-details/StudentSchedule";
import CoachAttendanceSection from "./student-details/CoachAttendanceSection";
import type { Message } from "@/src/lib/messaging/types";
import type { Database } from "@/src/services/supabase/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

export type AttendanceStatus = "attended" | "missed" | "cancelled";

interface CoachSession {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface AttendanceResponseRecord {
  session_id: number | null;
  status: AttendanceStatus;
}

type AttendanceMarkableSession = Pick<CoachSession, "id" | "start_time">;

interface StudentDetailsProps {
  student: Student | null;
  currentUserId: string;
  currentUserEmail: string;
  autoOpenChatTarget?: "student" | "parent" | null;
  autoOpenChatKey?: string | number;
}

type ChatTarget = "student" | "parent" | null;

export default function StudentDetails({
  student,
  currentUserId,
  currentUserEmail,
  autoOpenChatTarget = null,
  autoOpenChatKey = "",
}: StudentDetailsProps) {
  const [activeChat, setActiveChat] = useState<ChatTarget>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [allSessions, setAllSessions] = useState<CoachSession[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [lastAutoOpenKey, setLastAutoOpenKey] = useState<
    string | number | null
  >(null);
  const [attendanceBySessionId, setAttendanceBySessionId] = useState<
    Record<number, AttendanceStatus>
  >({});
  const [submittingSessionId, setSubmittingSessionId] = useState<number | null>(
    null,
  );
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(
    null,
  );
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(true);

  // Reset state when student changes
  useEffect(() => {
    setActiveChat(null);
    setConversationId(null);
    setMessages([]);
    setAllSessions([]);
    setAttendanceBySessionId({});
    setAttendanceMessage(null);
    setIsScheduleOpen(true);
    setIsAttendanceOpen(true);
  }, [student?.id]);

  // Auto-open chat when requested by URL action or list action.
  useEffect(() => {
    if (!student || !autoOpenChatTarget) return;
    if (lastAutoOpenKey === autoOpenChatKey) return;
    setLastAutoOpenKey(autoOpenChatKey);
    openChat(autoOpenChatTarget, { forceOpen: true });
  }, [autoOpenChatTarget, autoOpenChatKey, lastAutoOpenKey, student?.id]);

  // Fetch all sessions + existing attendance records together
  useEffect(() => {
    if (!student) return;
    setLoadingSchedule(true);

    Promise.all([
      fetch(`/api/coach/sessions?student_id=${student.id}`).then((r) =>
        r.ok ? r.json() : { sessions: [] as CoachSession[] },
      ),
      fetch(`/api/attendance?student_id=${student.id}`).then((r) =>
        r.ok ? r.json() : { attendance: [] as AttendanceResponseRecord[] },
      ),
    ])
      .then(([sessionsData, attendanceData]) => {
        setAllSessions((sessionsData.sessions ?? []) as CoachSession[]);

        const map: Record<number, AttendanceStatus> = {};
        for (const record of (attendanceData.attendance ??
          []) as AttendanceResponseRecord[]) {
          if (record.session_id != null) {
            map[record.session_id] = record.status as AttendanceStatus;
          }
        }
        setAttendanceBySessionId(map);
      })
      .catch(console.error)
      .finally(() => setLoadingSchedule(false));
  }, [student?.id]);

  async function handleMarkAttendance(
    session: AttendanceMarkableSession,
    status: AttendanceStatus,
  ) {
    if (!student || submittingSessionId === session.id) return;
    setAttendanceMessage(null);
    setSubmittingSessionId(session.id);
    const previousStatus = attendanceBySessionId[session.id];
    const isClearing = previousStatus === status;

    setAttendanceBySessionId((prev) => {
      if (!isClearing) return { ...prev, [session.id]: status };
      const next = { ...prev };
      delete next[session.id];
      return next;
    });

    try {
      const res = isClearing
        ? await fetch("/api/attendance", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: student.id,
              session_date: session.start_time,
              session_id: session.id,
            }),
          })
        : await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: student.id,
              session_date: session.start_time,
              session_id: session.id,
              status,
            }),
          });
      if (!res.ok) throw new Error("Failed to save attendance");
      setAttendanceMessage(
        isClearing ? "Attendance cleared." : "Attendance updated.",
      );
    } catch {
      setAttendanceBySessionId((prev) => {
        const next = { ...prev };
        if (previousStatus == null) {
          delete next[session.id];
        } else {
          next[session.id] = previousStatus;
        }
        return next;
      });
      setAttendanceMessage("Could not update attendance. Please try again.");
    } finally {
      setSubmittingSessionId(null);
    }
  }

  // upcoming = future sessions not yet confirmed as attended/missed
  // attendance = past sessions OR any session already marked attended/missed/cancelled
  const now = new Date().toISOString();
  const upcomingSessions = allSessions.filter((s) => {
    if (!s.start_time || s.start_time < now) return false;
    return attendanceBySessionId[s.id] == null;
  });
  const attendanceSessions = allSessions
    .filter((s) => {
      if (!s.start_time) return false;
      return s.start_time < now || attendanceBySessionId[s.id] != null;
    })
    .sort((a, b) => (a.start_time < b.start_time ? 1 : -1))
    .slice(0, 10);

  async function openChat(
    type: "student" | "parent",
    options?: { forceOpen?: boolean },
  ) {
    if (!options?.forceOpen && activeChat === type) {
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
      const msgs = msgsRes.ok ? ((await msgsRes.json()) as Message[]) : [];

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
      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm flex items-center justify-center flex-1 p-8">
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

  const studentFullName = fullName(
    student.first_name,
    student.last_name,
    "Unnamed Student",
  );

  return (
    <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm flex-1 flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
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
            user={{
              id: currentUserId,
              name: currentUserEmail,
              avatar_url: null,
            }}
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
              <h3 className="text-xl font-bold text-gray-900">
                {studentFullName}
              </h3>
            </div>

            {/* Schedule section */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-4">
              <button
                type="button"
                onClick={() => setIsScheduleOpen((v) => !v)}
                className="flex items-center justify-between w-full mb-1"
              >
                <h4 className="text-sm font-semibold text-[#2B4257]">
                  Upcoming Schedule
                </h4>
                <ChevronDown
                  size={16}
                  className={`text-[#2B4257]/50 transition-transform duration-200 ${isScheduleOpen ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              {isScheduleOpen && (
                <>
                  <p className="text-xs text-gray-400 mb-3">
                    Mark attendance directly from each session row. All times
                    shown in your local timezone.
                  </p>
                  {attendanceMessage && (
                    <p
                      className={`mb-3 text-xs ${
                        attendanceMessage.startsWith("Could not")
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {attendanceMessage}
                    </p>
                  )}
                  <div className="max-h-52 overflow-y-auto pr-1">
                    <StudentSchedule
                      sessions={upcomingSessions}
                      loading={loadingSchedule}
                      attendanceBySessionId={attendanceBySessionId}
                      onMarkAttendance={handleMarkAttendance}
                      submittingSessionId={submittingSessionId}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Attendance section */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <button
                type="button"
                onClick={() => setIsAttendanceOpen((v) => !v)}
                className="flex items-center justify-between w-full mb-4"
              >
                <h4 className="text-sm font-semibold text-[#2B4257]">
                  Attendance
                </h4>
                <ChevronDown
                  size={16}
                  className={`text-[#2B4257]/50 transition-transform duration-200 ${isAttendanceOpen ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              {isAttendanceOpen && (
                <CoachAttendanceSection
                  sessions={attendanceSessions}
                  loading={loadingSchedule}
                  attendanceBySessionId={attendanceBySessionId}
                  onMarkAttendance={handleMarkAttendance}
                  submittingSessionId={submittingSessionId}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
