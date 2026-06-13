"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { Badge } from "@/src/components/ui/badge";
import type { NavBadgeVariant } from "./types";

type Props = {
  id: number;
  name: string;
  state: boolean;
  link: string;
  onSelect?: () => void;
  icon?: ReactNode;
  badge?: number;
  badgeVariant?: NavBadgeVariant;
};

/**
 * A single selectable item in the dashboard `SideBar`. Purely presentational:
 * the active state, badge count, and badge colour are all driven by props so
 * any audience (families, coach) can reuse it.
 */
export default function SideBarBox({
  name,
  state,
  link,
  onSelect,
  icon,
  badge,
  badgeVariant = "primary",
}: Props) {
  const backgroundColor = state ? "bg-[#B1E7D6]" : "bg-[#1F2E3B]";
  const textColor = state ? "text-[#1F2E3B]" : "text-[#B1E7D6]";

  return (
    <Link href={link}>
      <div
        className={`text-sm lg:text-[clamp(0.8rem,1.1vw,1rem)]
          flex flex-row lg:flex-row-reverse justify-between lg:justify-end items-center
          w-auto lg:max-w-[clamp(160px,calc(68px+9vw),204px)]
          lg:h-[clamp(56px,calc(-9px+6.4vw),78px)]
          px-1 lg:px-[clamp(16px,calc(-50px+6.4vw),40px)]
          lg:shadow-[0_4px_4px_rgba(0,0,0,0.25)] ${backgroundColor}
          rounded-lg lg:rounded-2xl font-semibold`}
        onClick={onSelect}
      >
        <span className="flex items-center gap-2 lg:ml-[clamp(8px,calc(-16px+2.4vw),24px)]">
          <p className={`${textColor} text-center`}>{name}</p>
          {badge && badge > 0 ? (
            <Badge
              variant={badgeVariant}
              shape="circle"
              size="md"
              aria-label={`${name}: ${badge}`}
            >
              {badge > 9 ? "9+" : badge}
            </Badge>
          ) : null}
        </span>
        <span className={textColor}>{icon}</span>
      </div>
    </Link>
  );
}
