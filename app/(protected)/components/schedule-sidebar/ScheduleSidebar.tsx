"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import UpcomingLessonsList from "./UpcomingLessonsList";
import AvailableTimeSlotsList from "./AvailableTimeSlotsList";

type Lesson = {
  id: number;
  title: string;
  starts_at: Date;
};

type TimeSlot = {
  id: number;
  date: Date;
  coach: string;
};

type ScheduleSidebarProps = {
  upcomingLessons: Lesson[]; // Array storing the lessons to populate component with
  sideBarHeading?: string; // Different heading when displayed in student home page
};

// Schedule Sidebar
const ScheduleSidebar = ({ upcomingLessons, sideBarHeading }: ScheduleSidebarProps) => {
  // Check if current page is /calendar, rescheduling functionality is only
  const pathname = usePathname();
  const isCalendarPage = pathname === "/calendar";

  // ====== State Variables =====
  // Track selected upcoming schedule to reschedule
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    null
  );
  // Track selected time slot to reschedule the selected lesson to
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(
    null
  );
  // Track which screen to show (upcoming schedules, available time slots, etc)
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedTimeSlot, setConfirmedTimeSlot] = useState<TimeSlot | null>(
    null
  );

  // TODO: Replace with actual time slots from backend based on selected lesson
  const availableTimeSlots: TimeSlot[] = [
    {
      id: 1,
      date: new Date("2024-05-06T15:00:00"),
      coach: "Coach John",
    },
    {
      id: 2,
      date: new Date("2024-05-07T15:00:00"),
      coach: "Coach Sarah",
    },
    {
      id: 3,
      date: new Date("2024-05-08T15:00:00"),
      coach: "Coach Mike",
    },
    {
      id: 4,
      date: new Date("2024-05-09T15:00:00"),
      coach: "Coach Emily",
    },
    {
      id: 5,
      date: new Date("2024-05-10T15:00:00"),
      coach: "Coach Anna",
    },
  ];

  // = Functions to handle selecting lessons & selecting available time slots =
  const handleSelectLesson = (id: number) => {
    setSelectedLessonId((prevId) => (prevId === id ? null : id));
    setShowTimeSlots(false);
    setSelectedTimeSlotId(null);
    setShowConfirmation(false);
  };

  const handleSelectTimeSlot = (id: number) => {
    setSelectedTimeSlotId((prevId) => (prevId === id ? null : id));
  };

  // ==== Functions to Handle Buttons At The Bottom of Schedule Sidebar =====//
  const handleReschedule = () => {
    // If reschedule button is clicked when a lesson is selected
    if (selectedLessonId !== null && !showTimeSlots) {
      setShowTimeSlots(true); // show the available time slots
    } else if (selectedTimeSlotId !== null) {
      // If time slot is selected, and user clicks the button
      // Get the 'id' of the selected time slot
      const timeSlot = availableTimeSlots.find(
        (slot) => slot.id === selectedTimeSlotId
      );
      // Update the selected lesson on the backend, to the rescheduled time
      // Render the confirmation screen
      if (timeSlot) {
        setConfirmedTimeSlot(timeSlot);
        setShowTimeSlots(false);
        setShowConfirmation(true);
        // TODO: Implement actual reschedule logic to backend
        console.log(
          `Rescheduling lesson ${selectedLessonId} to timeSlot ${selectedTimeSlotId}`
        );
      }
    }
  };

  // If close menu is clicked, return to "upcoming schedules" screen
  const handleCloseMenu = () => {
    setShowTimeSlots(false);
    setSelectedTimeSlotId(null);
  };

  // If user clicks okay after rescheduling has been confirmed
  // Return back to "upcoming schedules" screen
  const handleOkay = () => {
    setShowConfirmation(false);
    setSelectedLessonId(null);
    setSelectedTimeSlotId(null);
    setConfirmedTimeSlot(null);
  };

  // ==== Helper Functions to format time for display ====
  // Format date for confirmation display
  const formatConfirmationDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Format time for confirmation display
  const formatConfirmationTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Depending on the state variables, the schedule sidebar will render different
  // screens (Upcoming Lessons, Rescheduling Time Slots, Confirmation of Rescheduling)
  return (
    <div
      className={`w-full h-full p-5 rounded-[20px] flex flex-col ${
        showConfirmation
          ? "bg-[#1F2E3B] border-[5px] border-[#B1E7D6]"
          : "bg-[#B1E7D6]"
      }`}
    >
      {/* "Upcoming Lessons" Screen 
         Schedule bar will show upcoming lessons by default. Until the user
         clicks the 'reschedule button'
      */}
      {!showConfirmation && !showTimeSlots && (
        <>
          <h1 className="mb-5 text-[#1F2E3B] font-semibold">
            {sideBarHeading}
          </h1>

          {/* List of Upcoming Lessons */}
          <UpcomingLessonsList
            lessons={upcomingLessons}
            selectedLessonId={selectedLessonId}
            onSelectLesson={handleSelectLesson}
          />

          {/* Buttons Container - Only show on calendar page */}
          {isCalendarPage && (
            <div className="flex justify-end">
              <button
                onClick={handleReschedule}
                className={`w-40 h-[38px] mt-8 mb-4 rounded-lg font-semibold ${
                  selectedLessonId !== null
                    ? "bg-[#1F2E3B] text-[#B1E7D6] cursor-pointer"
                    : "bg-[#65CFAD]"
                }`}
                disabled={selectedLessonId === null}
              >
                Reschedule
              </button>
            </div>
          )}
        </>
      )}

      {/* TimeSlots List Screen 
          Show this screen if reschedule button has been clicked
      */}
      {!showConfirmation && showTimeSlots && (
        <>
          <h1 className="mb-5 text-[#1F2E3B] font-semibold">
            Choose a New Time
          </h1>

          {/* List of Available TimeSlots */}
          <AvailableTimeSlotsList
            timeSlots={availableTimeSlots}
            selectedLessonTitle={
              upcomingLessons.find((lesson) => lesson.id === selectedLessonId)
                ?.title || ""
            }
            selectedTimeSlotId={selectedTimeSlotId}
            onSelectTimeSlot={handleSelectTimeSlot}
          />
          
          {/* Buttons Container - Only show on calendar page */}
          {isCalendarPage && (
            <div className="flex justify-between gap-3">
              {/* Return to previous screen button */}
              <button
                onClick={handleCloseMenu}
                className="w-40 h-[38px] mt-8 mb-4 rounded-lg bg-[#1F2E3B] text-[#B1E7D6] font-semibold cursor-pointer"
              >
                Close Menu
              </button>
              {/* Confirm rescheduled time slot button */}
              <button
                onClick={handleReschedule}
                className={`w-40 h-[38px] mt-8 mb-4 rounded-lg font-semibold ${
                  selectedTimeSlotId !== null
                    ? "bg-[#1F2E3B] text-[#B1E7D6] cursor-pointer"
                    : "bg-[#65CFAD] text-[#1F2E3B]"
                }`}
                disabled={selectedTimeSlotId === null}
              >
                Confirm
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Screen 
          This screen is shown after the user 
      */}
      {showConfirmation && confirmedTimeSlot && (
        <>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <h2 className="text-[#65CFAD] font-semibold text-lg mb-6">
                Confirmation:
              </h2>
              <p className="text-[#65CFAD] font-semibold mb-2">
                {formatConfirmationDate(confirmedTimeSlot.date)}
              </p>
              <p className="text-[#65CFAD] font-semibold mb-2">
                {upcomingLessons.find(
                  (lesson) => lesson.id === selectedLessonId
                )?.title || ""}
              </p>
              <p className="text-[#65CFAD] font-semibold">
                {formatConfirmationTime(confirmedTimeSlot.date)}
              </p>
            </div>
          </div>

          {/* Okay Button - Only show on calendar page */}
          {isCalendarPage && (
            <div className="flex justify-center">
              <button
                onClick={handleOkay}
                className="w-40 h-[38px] mb-4 rounded-lg bg-[#65CFAD] text-[#1F2E3B] font-semibold cursor-pointer"
              >
                Okay
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduleSidebar;
