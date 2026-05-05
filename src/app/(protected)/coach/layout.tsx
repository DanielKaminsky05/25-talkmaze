
import { ReactNode } from "react";

export default function coachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#2B4257]">
      {children}
    </div>
  );
}