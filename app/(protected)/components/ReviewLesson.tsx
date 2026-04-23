"use client";

interface ReviewLessonCardProps {
  lessonNumber?: number;
  title?: string;
  imageUrl?: string;
  onClick?: () => void;
}

export default function ReviewLessonCard({
  lessonNumber = 7,
  title = "Overcoming Nerves",
  imageUrl = "https://placehold.co/353x244",
  onClick,
}: ReviewLessonCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden shrink-0 group cursor-pointer"
      style={{
        width: "100%",
        height: "171px",
        backgroundColor: "var(--talkmaze_green_light, #B1E7D6)",
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute left-[18px] top-[15px] w-[145px] h-[35px]">
        <div className="w-full h-full bg-white rounded-xl shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <span
            className="text-center"
            style={{
              color: "var(--Dark-Navy, #1F2E3B)",
              fontSize: "16px",
              fontFamily: "Roboto, sans-serif",
              fontWeight: 600,
            }}
          >
            Review: Lesson {lessonNumber}
          </span>
        </div>
      </div>

      <div className="absolute left-[263px] top-[15px] w-[67px] h-[63px] bg-white rounded-xl shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="absolute left-[7px] top-[5px] w-[53px] h-[53px]" data-token="seashell">
          <div className="absolute left-[0.62px] top-[1.12px] w-[51.76px] h-[50.75px] bg-[#ACBBBA]" />
          <div className="absolute left-[6.46px] top-[6.31px] w-[41.08px] h-[41.06px] bg-[#819A97]" />
          <div className="absolute left-[38.16px] top-[23.66px] w-[9.01px] h-[12.65px] bg-[#6F7F7D]" />
        </div>
      </div>

      <div className="absolute left-0 top-[114.8px] w-full h-14 bg-[#65CFAD] flex items-start justify-center pt-4">
        <span
          className="text-center"
          style={{
            color: "white",
            fontSize: "20px",
            fontFamily: "Roboto, sans-serif",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
