"use client";
import { useRouter, usePathname } from "next/navigation";
import TopBar from "@/src/components/common/navigation/TopBar";
import ProfileMenu, {
  type ProfileMenuItem,
} from "@/src/components/common/navigation/ProfileMenu";
import StartVideoLessonBox from "./StartVideoLessonBox";
import { signOut } from "@/src/lib/auth/actions/signOut";
import { usePageTitle } from "../../_context/PageTitleContext";

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
  { prefix: "Lessons", match: "/student/lessons" },
  // { prefix: "Rewards", match: "/student/reward" },
];

type Props = {
  profileType: "student" | "parent";
  avatarUrl: string | null;
};

/**
 * Families adapter for the shared `TopBar`: computes the role/sub-page title
 * and supplies the right-side actions (Start Video Lesson for students + the
 * profile menu).
 */
export default function FamiliesTopBar({ profileType, avatarUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Use a sub-page title if the current route matches, otherwise show the
  // role-appropriate dashboard title ("Student Dashboard" / "Parent Dashboard")
  const { title: contextTitle } = usePageTitle();
  const page = PAGE_TITLE.find((p) => pathname.startsWith(p.match));
  const title =
    contextTitle ?? (page ? page.prefix : DASHBOARD_TITLE[profileType]);

  const menuItems: ProfileMenuItem[] = [
    {
      label: "Manage Profile",
      onSelect: () => router.push(`/${profileType}/profile`),
    },
    { label: "Switch Profiles", onSelect: () => router.push("/profiles") },
    { label: "Sign Out", onSelect: () => signOut() },
  ];

  return (
    <TopBar
      title={title}
      rightSlot={
        <>
          {profileType === "student" && <StartVideoLessonBox />}
          <ProfileMenu avatarUrl={avatarUrl} items={menuItems} />
        </>
      }
    />
  );
}
