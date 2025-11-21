"use client";

import React from "react";

interface LessonCardProps {
  type: "Review" | "Up Next";
  lessonNumber: number;
  title: string;
  /** * Pass the icon JSX here. 
   * For the "Seashell", use the code provided. 
   * For "Glasses", paste the Figma div code when you have it.
   */
  icon?: React.ReactNode; 
}

export default function LessonCard({ 
  type, 
  lessonNumber, 
  title, 
  icon 
}: LessonCardProps) {
  return (
    <div
      className="relative bg-[#B1E7D6] rounded-[12px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden shrink-0"
      style={{
        width: "353px",
        height: "244px",
        // Using the background image from Figma if available, else falling back to color
        // backgroundImage: "url(https://placehold.co/353x244)", 
      }}
    >
      {/* Top Right Icon Box 
        Fixed position per Figma: left: 263px; top: 15px;
      */}
      <div 
        className="absolute bg-white rounded-[12px] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden flex items-center justify-center"
        style={{
          width: "67px",
          height: "63px",
          left: "263px",
          top: "15px",
        }}
      >
         {/* Render the passed icon or a fallback */}
        {icon ? icon : <div className="w-8 h-8 bg-gray-200 rounded-full" />}
      </div>

      {/* Top Left Label Pill 
        Fixed position per Figma: left: 18px; top: 15px;
      */}
      <div 
        className="absolute"
        style={{
          width: "145px",
          height: "35px",
          left: "18px",
          top: "15px"
        }}
      >
        <div 
          className="w-full h-full bg-white rounded-[12px] shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center pl-1"
        >
            <span 
              style={{
                color: "#1F2E3B", // var(--Dark-Navy)
                fontSize: "16px",
                fontFamily: "Roboto, sans-serif",
                fontWeight: 600,
              }}
            >
              {type}: Lesson {lessonNumber}
            </span>
        </div>
      </div>

      {/* Bottom Title Bar
        Fixed position per Figma: left: 0px; top: 164px;
      */}
      <div 
        className="absolute bg-[#65CFAD] rounded-b-[12px] flex items-center justify-center"
        style={{
          width: "353px",
          height: "80px",
          left: "0px",
          top: "164px"
        }}
      >
        <span
          className="text-center"
          style={{
            color: "white",
            fontSize: "20px",
            fontFamily: "Roboto, sans-serif",
            fontWeight: 600,
            wordWrap: "break-word"
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}