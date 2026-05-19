"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import type { ComponentProps } from "react";

type FullCalendarProps = ComponentProps<typeof FullCalendar>;

interface AdminCalendarProps {
  events: EventInput[];
  initialView?: "dayGridMonth" | "timeGridWeek" | "timeGridDay";
  /** Pixels consumed above the calendar (header + cards + padding).
   *  Defaults work for the admin detail panel layout. */
  offsetPx?: number;
  loading?: boolean;
  initialDate?: string;
  onEventClick?: FullCalendarProps["eventClick"];
  dayMaxEvents?: FullCalendarProps["dayMaxEvents"];
  dayMaxEventRows?: FullCalendarProps["dayMaxEventRows"];
  expandRows?: FullCalendarProps["expandRows"];
  moreLinkClick?: FullCalendarProps["moreLinkClick"];
  headerToolbar?: FullCalendarProps["headerToolbar"];
  className?: string;
}

export default function AdminCalendar({
  events,
  initialView = "dayGridMonth",
  offsetPx = 300,
  loading = false,
  initialDate,
  onEventClick,
  dayMaxEvents,
  dayMaxEventRows,
  expandRows,
  moreLinkClick,
  headerToolbar,
  className,
}: AdminCalendarProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTimeGrid = initialView !== "dayGridMonth";
  const calHeight = `calc(100vh - ${offsetPx}px)`;
  const resolvedHeaderToolbar = headerToolbar ?? {
    left: "prev,next today",
    center: "title",
    right: isTimeGrid
      ? "timeGridWeek,timeGridDay"
      : "dayGridMonth,timeGridWeek",
  };

  return (
    <div className={["admin-calendar", className].filter(Boolean).join(" ")}>
      <FullCalendar
        key={`${initialView}-${initialDate ?? "default"}`}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        initialDate={initialDate}
        events={events}
        headerToolbar={resolvedHeaderToolbar}
        eventClick={onEventClick}
        dayMaxEvents={dayMaxEvents}
        dayMaxEventRows={dayMaxEventRows}
        expandRows={expandRows}
        moreLinkClick={moreLinkClick}
        height={calHeight}
        eventDisplay="block"
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: "short",
        }}
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
