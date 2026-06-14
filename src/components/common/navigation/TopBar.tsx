"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReactNode } from "react";

type Props = {
  /** Title shown next to the back button. */
  title: string;
  /** Right-aligned actions (e.g. a CTA button + profile menu). */
  rightSlot?: ReactNode;
};

/**
 * Dashboard top bar shared by the families and coach shells: a back button +
 * page title on the left, and a caller-supplied actions slot on the right.
 */
export default function TopBar({ title, rightSlot }: Props) {
  const router = useRouter();

  return (
    <div
      className="flex flex-row gap-2 pl-3.5 pr-0 py-3 items-center justify-between
      md:pl-8 md:pr-0 md:pt-[23px] md:pb-[15px]  lg:pl-0 max-w-full"
    >
      {/* Back Button */}
      <div
        className="flex flex-row items-center h-[66px] min-w-0 flex-1"
        onClick={() => router.back()}
      >
        <Image
          src="/images/icons/caret.png"
          alt="caret"
          width={36}
          height={34.88}
          className="shrink-0"
        />
        <p className="text-white text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold ml-3 truncate min-w-0">
          {title}
        </p>
      </div>
      {/* Right-side actions */}
      <div className="flex flex-row gap-2 sm:gap-4 md:gap-10 items-center shrink-0">
        {rightSlot}
      </div>
    </div>
  );
}
