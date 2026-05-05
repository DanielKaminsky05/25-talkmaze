"use client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import StartVideoLessonBox from "./StartVideoLessonBox";
import AvatarIcon from "./AvatarIcon";
import { signOut } from "@/src/lib/auth/signout";
import { usePageTitle } from "../_context/PageTitleContext";

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
  { prefix: "Lessons", match: "/lessons" },
  // { prefix: "Rewards", match: "/reward" },
];

type Props = {
  profileType: "student" | "parent";
  avatarUrl: string | null;
};

// Navigation Bar Component
export default function NavigationBar({ profileType, avatarUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function goBack() {
    router.back();
  }

  // Use a sub-page title if the current route matches, otherwise show the
  // role-appropriate dashboard title ("Student Dashboard" / "Parent Dashboard")
  const { title: contextTitle } = usePageTitle();
  const page = PAGE_TITLE.find((p) => pathname.startsWith(p.match));
  const title =
    contextTitle ?? (page ? page.prefix : DASHBOARD_TITLE[profileType]);

  return (
    <div
      className="flex flex-row pl-3.5 pr-0 py-3 items-center justify-between 
      md:pl-8 md:pr-0 md:pt-[23px] md:pb-[15px]  lg:pl-0 max-w-full"
    >
      {/* Back Button */}
      <div
        className="flex flex-row items-center min-w-[100px] h-[66px]"
        onClick={goBack}
      >
        <Image src="/caret.png" alt="caret" width={36} height={34.88} />
        <p
          className="inline text-white text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold ml-3
          truncate max-w-[130px] sm:max-w-xs md:max-w-sm lg:max-w-none"
        >
          {title}
        </p>
      </div>
      {/* Profile & Video Lesson Buttons */}
      <div className="flex flex-row gap-4 md:gap-10 items-center">
        {profileType === "student" && <StartVideoLessonBox />}
        <AvatarIcon profileType={profileType} avatarUrl={avatarUrl} />
      </div>
    </div>
  );
}
