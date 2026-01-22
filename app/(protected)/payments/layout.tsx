"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import NavigationBar from "../components/NavigationBar";
import SideBar from "../components/Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // URL is /payments even though folder is (protected)/payments
  const isPaymentsPage = pathname.startsWith("/payments");

  // 👉 For /payments, DON'T render sidebar + nav
  if (isPaymentsPage) {
    return <>{children}</>;
  }

  // 👉 All other protected routes keep the dashboard shell
  return (
    <div className="flex flex-row w-screen h-screen">
      <SideBar />
      <div className="flex flex-1 flex-col">
        <NavigationBar />
        {children}
      </div>
    </div>
  );
}
