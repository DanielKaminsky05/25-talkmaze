import { ReactNode } from "react";
import CoachNavbar from "./_components/CoachNavbar";

export default function coachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#2B4257] flex flex-col relative">
      <CoachNavbar />
      {children}
    </div>
  );
}
