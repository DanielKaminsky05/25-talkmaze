"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg, EventInput } from "@fullcalendar/core";
import type { ComponentProps } from "react";

type FullCalendarProps = ComponentProps<typeof FullCalendar>;

function renderEventContent(arg: EventContentArg) {
  const isDayGrid = arg.view.type === "dayGridMonth";
  if (!isDayGrid) {
    return undefined;
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        minWidth: 0,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {arg.timeText && (
        <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
          {arg.timeText}
        </span>
      )}
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {arg.event.title}
      </span>
    </div>
  );
}

interface AdminCalendarProps {
  events: EventInput[];
  initialView?: "dayGridMonth" | "timeGridWeek" | "timeGridDay";
  theme?: "dark" | "light";
  /** Explicit calendar height (e.g. `640`, `70vh`, `clamp(...)`). */
  height?: string | number;
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
  theme = "dark",
  height,
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
  const calHeight = height ?? `calc(100vh - ${offsetPx}px)`;
  const resolvedHeaderToolbar = headerToolbar ?? {
    left: "prev,next today",
    center: "title",
    right: isTimeGrid
      ? "timeGridWeek,timeGridDay"
      : "dayGridMonth,timeGridWeek",
  };

  return (
    <div
      className={["admin-calendar", `admin-calendar--${theme}`, className]
        .filter(Boolean)
        .join(" ")}
    >
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
        eventContent={renderEventContent}
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
