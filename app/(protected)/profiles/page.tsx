"use client"

import ProfileCard from "../components/ProfileCard";


const profiles = [
  { id: "1", name: "Meera", imageUrl: "/meera-profile.png", hasPin: true },
  { id: "2", name: "Priya", imageUrl: "/priya-profile.png", hasPin: false },
];

import { useRouter } from "next/navigation";


export default function ProfilesPage() {

  const router = useRouter();
  return (
    <div className="min-h-screen w-full bg-[#2b4257] font-[Roboto,sans-serif]">
      <header className="absolute left-[clamp(16px,1.5vw,24px)] top-[clamp(15px,2vw,30px)] flex items-center gap-1">
        <img
          src="/talkmaze-logo.png"
          alt="TalkMaze Logo"
          className="w-[clamp(36px,3.4vw,52px)] h-[clamp(36px,3.4vw,52px)] object-contain"
        />
        <span className="text-[clamp(16px,1.3vw,20px)] font-semibold">
          <span className="text-[#65cfad]">Talk</span>
          <span className="text-white">Maze</span>
        </span>
      </header>

      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-[clamp(18px,1.6vw,24px)] font-bold text-white mb-[clamp(48px,8vw,120px)]">
          Select Your Profile: Parent or Student
        </h1>

        <div className="flex items-start justify-center gap-[clamp(24px,4vw,60px)] flex-wrap">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              id={profile.id}
              name={profile.name}
              imageUrl={profile.imageUrl}
              hasPin={profile.hasPin}
              onClickRedirect={"/home"}
            />
          ))}

          <div className="flex flex-col items-center">
            <a
              href="/profiles/new"
              className="flex flex-col items-center gap-[clamp(12px,1.3vw,20px)] cursor-pointer group"
            >
              <div className="w-[clamp(140px,14vw,200px)] aspect-square rounded-xl bg-[#b1e7d6] border-[0.5px] border-black shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center mix-blend-color-dodge">
                  <img
                    src="/lock-icon.svg"
                    alt=""
                    className="w-[75%] h-[75%] object-contain"
                  />
                </div>
                <div className="absolute inset-0 shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-xl pointer-events-none" />
              </div>

              <span className="text-[clamp(16px,1.5vw,22px)] font-bold text-white">
                + add profile
              </span>
            </a>
            <div className="h-[clamp(40px,4vw,60px)]" />
          </div>
        </div>

        <button className="mt-[clamp(16px,1.5vw,24px)] w-[clamp(180px,16vw,240px)] h-[clamp(40px,3.5vw,52px)] bg-[#1f2e3b] border-[0.5px] border-[#4e4c4c] rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer">
          <span className="text-[clamp(11px,0.9vw,14px)] font-semibold text-white" onClick = {() => router.push('/manageProfile')}>
            Manage your profiles
          </span>
        </button>
      </main>
    </div>
  );
}
