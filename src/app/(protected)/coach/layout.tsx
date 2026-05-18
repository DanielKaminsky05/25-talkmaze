import { ReactNode } from "react";
import CoachNavbar from "./_components/CoachNavbar";

export default function coachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-[#2B4257] flex flex-col relative overflow-hidden">
      <CoachNavbar />
      {children}
    </div>
  );
}
