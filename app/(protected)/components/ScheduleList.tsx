"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Appointment {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    description?: string;
}

export default function ScheduleList({ schedule }: { schedule: Appointment[] }) {
    if (schedule.length === 0) {
        return (
            <div className="w-[100%] h-[300px] rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                No upcoming lessons.
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <h3 className="text-xl font-bold text-[#2B4257]">Upcoming Lessons</h3>
            <div className="flex flex-col gap-3">
                {schedule.slice(0, 3).map((item) => {
                    const startDate = new Date(item.start_date);
                    const dateStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const timeStr = startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

                    return (
                        <Link
                            key={item.id}
                            href={`/calendar`}
                            className="block group"
                        >
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-center cursor-pointer">
                                <div>
                                    <div className="font-semibold text-[#2B4257] group-hover:text-[#B1E7D6] transition-colors">
                                        {item.title}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {dateStr} • {timeStr}
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#f0f9f6] flex items-center justify-center text-[#2B4257]">
                                    →
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
