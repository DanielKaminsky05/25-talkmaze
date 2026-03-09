"use client";

interface ProfileCardProps {
  id: string;
  name: string;
  imageUrl: string;
  hasPin: boolean;
}

export default function ProfileCard({
  id,
  name,
  imageUrl,
  hasPin,
}: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Clicking the card image/name submits the parent <form> */}
      <button
        type="submit"
        className="flex flex-col items-center gap-[clamp(12px,1.3vw,20px)] cursor-pointer group bg-transparent border-none p-0"
      >
        <div className="w-[clamp(140px,14vw,200px)] aspect-square rounded-xl overflow-hidden bg-[#b1e7d6] border-[0.5px] border-black shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] relative">
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-xl pointer-events-none" />
        </div>

        <span className="text-[clamp(16px,1.5vw,22px)] font-bold text-white">
          {name}
        </span>
      </button>

      <div className="h-[clamp(40px,4vw,60px)] flex items-center justify-center">
        {hasPin && (
          <div className="flex items-center gap-[clamp(4px,0.5vw,7px)]">
            <img
              src="/lock-icon.svg"
              alt="Lock"
              className="w-[clamp(14px,1.2vw,18px)] h-[clamp(14px,1.2vw,18px)]"
            />
            <input
              type="password"
              name="pin"
              placeholder="PIN"
              onClick={(e) => e.stopPropagation()}
              className="w-[clamp(80px,8vw,120px)] h-[clamp(32px,3vw,44px)] bg-white border-[0.5px] border-[#1f2e3b] rounded-lg px-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
