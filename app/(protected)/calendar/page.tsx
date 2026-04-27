"use client";

import { useEffect, useState } from "react";
import Calendar from "../components/calendar/Calendar";
import ScheduleSidebar from "../components/schedule-sidebar/ScheduleSidebar";
import { createClient } from "@/services/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

type Lesson = {
    id: string;
    title: string;
    starts_at: Date;
};

const CalendarPage = () => {
    const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSchedule() {
            try {
                setLoading(true);

                const profile = await getActiveProfile();
                if (!profile || profile.type !== "student") {
                    setUpcomingLessons([]);
                    return;
                }

                const supabase = createClient();
                const now = new Date().toISOString();

                const { data: sessionsRaw, error } = await supabase
                    .from("sessions")
                    .select("id, start_time")
                    .eq("student_id", profile.id)
                    .gte("start_time", now)
                    .order("start_time", { ascending: true });

                if (error) {
                    console.error("Failed to load schedule:", error.message);
                    setUpcomingLessons([]);
                    return;
                }

                setUpcomingLessons(
                    (sessionsRaw ?? []).map((s: any) => ({
                        id: s.id.toString(),
                        title: "Public Speaking Session",
                        starts_at: new Date(s.start_time),
                    })),
                );
            } catch (err) {
                console.error("Error loading schedule:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSchedule();
    }, []);


    return (
        <div className="flex h-full mr-10 mb-6 bg-[#1F2E3B] shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] rounded-xl">
            <div className="w-full mt-[106px] ml-6 flex justify-evenly">

                <div className="w-[668px]">
                    <Calendar />
                </div>

                <div className="w-[402px] h-[592px]">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center text-[#B1E7D6]">
                            Loading Schedule...
                        </div>
                    ) : (
                        <ScheduleSidebar
                            sideBarHeading="Upcoming Lessons"
                            upcomingLessons={upcomingLessons}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
