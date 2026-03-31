"use client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import StartVideoLessonBox from "./StartVideoLessonBox";
import AvatorIcon from "./AvatorIcon";
import { signOut } from "@/lib/auth/signout";

// Default title shown on dashboard/home pages, keyed by profile type
const DASHBOARD_TITLE = {
  student: "Student Dashboard",
  parent: "Parent Dashboard",
};

/**
 * Sub-page titles shown when the user navigates away from the dashboard.
 * Checked against the current pathname; first match wins.
 * Falls back to DASHBOARD_TITLE[profileType] if no match is found.
 */
const PAGE_TITLE: { prefix: string; match: string }[] = [
  { prefix: "Lessons", match: "/lesson" },
  // { prefix: "Rewards", match: "/reward" },
];

type Props = {
  profileType: "student" | "parent";
};

// Navigation Bar Component
export default function NavigationBar({ profileType }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function goBack() {
    router.back();
  }

  // Use a sub-page title if the current route matches, otherwise show the
  // role-appropriate dashboard title ("Student Dashboard" / "Parent Dashboard")
  const page = PAGE_TITLE.find((p) => pathname.startsWith(p.match));
  const title = page ? page.prefix : DASHBOARD_TITLE[profileType];

  return (
    <div className="flex flex-row px-3.5 py-3 items-center justify-between md:px-8 md:py-6 lg:pl-0 max-w-full">
      {/* Back Button */}
      <div
        className="flex flex-row items-center min-w-[100px] h-[66px]"
        onClick={goBack}
      >
        <Image src="/caret.png" alt="caret" width={36} height={34.88} />
        <p
          className="hidden sm:inline text-white
          md:text-2xl lg:text-3xl font-bold ml-3"
        >
          {title}
        </p>
      </div>
      {/* Profile & Video Lesson Buttons */}
      <div className="flex flex-row gap-4 md:gap-10 items-center relative left-[3%]">
        <button
          onClick={signOut}
          className="text-white hover:text-gray-300 font-medium"
        >
          Sign Out
        </button>

        <button className="w-30 h-10" onClick={() => router.push("/payments")}>
          Manage Subscriptions
        </button>

        <StartVideoLessonBox />
        <AvatorIcon />
      </div>
    </div>
  );
}
