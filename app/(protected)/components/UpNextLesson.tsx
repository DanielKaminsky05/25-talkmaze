"use client";

interface NextLessonCardProps {
  lessonNumber?: number;
  title?: string;
  imageUrl?: string;
  onClick?: () => void;
}

export default function NextLessonCard({
  lessonNumber = 9,
  title = "Speech Blocking",
  imageUrl = "https://placehold.co/353x244",
  onClick,
}: NextLessonCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden shrink-0 group cursor-pointer w-full h-[171px]"
      style={{
        backgroundColor: "var(--talkmaze_green_light, #B1E7D6)",
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute left-[18px] top-[15px] h-[35px]" style={{ width: "162px" }}>
        <div className="w-full h-full bg-white rounded-xl shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] flex items-center justify-start pl-3">
          <span
            style={{
              color: "var(--Dark-Navy, #1F2E3B)",
              fontSize: "16px",
              fontFamily: "Roboto, sans-serif",
              fontWeight: 600,
            }}
          >
            Up Next: Lesson {lessonNumber}
          </span>
        </div>
      </div>

      <div className="absolute left-[263px] top-[15px] w-[67px] h-[63px] bg-white rounded-xl shadow-[inset_0px_4px_4px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="absolute left-[7px] top-[5px] w-[53px] h-[53px]" data-token="sunglasses">
          <div className="absolute left-[3.71px] top-[22.97px] w-[36.04px] h-[17.67px] bg-[#40C0E7]" />
          <div className="absolute left-[1.59px] top-[9.72px] w-[49.82px] h-[33.57px] bg-[#855C52]" />
          <div className="absolute left-[11.13px] top-[30.03px] w-[25.44px] h-[7.95px] bg-white" />
          <div className="absolute left-[2.12px] top-[11.48px] w-[47.70px] h-[18.55px] bg-[#B89278]" />
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
