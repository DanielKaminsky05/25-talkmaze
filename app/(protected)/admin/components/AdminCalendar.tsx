"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

interface AdminCalendarProps {
  events: EventInput[];
  initialView?: "dayGridMonth" | "timeGridWeek";
  /** Pixels consumed above the calendar (header + cards + padding).
   *  Defaults work for the admin detail panel layout. */
  offsetPx?: number;
  loading?: boolean;
}

export default function AdminCalendar({
  events,
  initialView = "dayGridMonth",
  offsetPx = 300,
  loading = false,
}: AdminCalendarProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTimeGrid = initialView === "timeGridWeek";
  const calHeight = `calc(100vh - ${offsetPx}px)`;

  return (
    <div className="admin-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        events={events}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: isTimeGrid ? "timeGridWeek,timeGridDay" : "dayGridMonth,timeGridWeek",
        }}
        height={calHeight}
        eventDisplay="block"
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime="07:00:00"
        scrollTimeReset={false}
        allDaySlot={false}
        nowIndicator
      />
    </div>
  );
}
