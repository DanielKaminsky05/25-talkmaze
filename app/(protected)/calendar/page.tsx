"use server";

import Calendar from "../components/calendar/Calendar";
import ScheduleSidebar from "../components/schedule-sidebar/ScheduleSidebar";

// Lesson records retrieved from database will contain these fields and more
// For now I just hard-code records retrieved from database
// TODO: remove this once backend integration has been implemented
type Lesson = {
  id: number;
  title: string;
  starts_at: Date;
};

const CalendarPage = () => {
  // Hard-coded array of upcoming lessons, meant to represent upcoming lessons
  // for the logged-in user, retrieved from database
  // TODO: Once a server action is created to fetch the lessons. Use a variable
  // storing the function to retrieve those lessons. eg. await getUpcomingSchedule()
  // Pass that function as a prop to the ScheduleSidebar Component.
  const upcomingLessons: Lesson[] = [
    {
      id: 1,
      title: "Explorer - Lesson 9",
      starts_at: new Date("2024-05-04T11:45:00"),
    },
    {
      id: 2,
      title: "Explorer - Lesson 10",
      starts_at: new Date("2024-05-11T11:45:00"),
    },
    {
      id: 3,
      title: "Explorer - Lesson 11",
      starts_at: new Date("2024-05-18T11:45:00"),
    },
    {
      id: 4,
      title: "Explorer - Lesson 12",
      starts_at: new Date("2024-05-25T11:45:00"),
    },
    {
      id: 5,
      title: "Explorer - Lesson 13",
      starts_at: new Date("2024-06-01T11:45:00"),
    },
  ];

  return (
    <div className="flex h-full mr-10 mb-6 bg-[#1F2E3B] shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] rounded-xl">
      <div className="w-full mt-[106px] ml-6 flex justify-evenly">
        {/* Calender Component Layout Wrapper Container */}
        <div className="w-[668px]">
          <Calendar />
        </div>
        {/* Schedule Sidebar Component Layout Wrapper Container*/}
        <div className="w-[402px] h-[592px]">
          <ScheduleSidebar
            sideBarHeading="Choose a Time to Reschedule"
            upcomingLessons={upcomingLessons}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
