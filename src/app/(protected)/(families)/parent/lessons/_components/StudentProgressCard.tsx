import Link from "next/link";
import Image from "next/image";
import LessonProgressBar from "@/src/app/(protected)/(families)/_components/LessonProgressBar";
import { TokenIcon } from "@/src/components/common/TokenIcon";
import { TokenMysteryStar } from "@/src/components/ui/icons";

interface TokenProp {
  id: string;
  icon_url: string | null;
  title: string;
}

interface StudentProgressCardProps {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  courseName: string | null;
  completedLessons: number;
  totalLessons: number;
  courseTokens: TokenProp[];
  earnedTokenIds: string[];
  isSetupComplete: boolean | null;
}

const MAX_TOKENS_SHOWN = 10;

export default function StudentProgressCard({
  studentId,
  name,
  avatarUrl,
  courseName,
  completedLessons,
  totalLessons,
  courseTokens,
  earnedTokenIds,
  isSetupComplete,
}: StudentProgressCardProps) {
  const earnedSet = new Set(earnedTokenIds);
  const visibleTokens = courseTokens.slice(0, MAX_TOKENS_SHOWN);
  const remainingCount = Math.max(0, courseTokens.length - MAX_TOKENS_SHOWN);
  const hasCourse = !!courseName && totalLessons > 0;

  if (isSetupComplete === false) {
    return (
      <Link href={`/onboarding?studentId=${studentId}`} className="group block">
        <div className="bg-white rounded-2xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-6 flex flex-col gap-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "#B1E7D6" }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span
                  className="text-xl font-bold"
                  style={{ color: "#2B4257" }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2
                className="font-bold text-lg truncate"
                style={{ color: "#2B4257" }}
              >
                {name}
              </h2>
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#F5A623] border border-[#F5A623]/30">
                Setup Required
              </span>
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between"
            style={{ backgroundColor: "#B1E7D6", color: "#2B4257" }}
          >
            Complete profile setup to get matched with a coach
            <svg
              width="6"
              height="10"
              viewBox="0 0 6 10"
              fill="none"
              className="shrink-0 ml-3"
            >
              <path
                d="M1 1L5 5L1 9"
                stroke="#2B4257"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/parent/lessons/${studentId}`} className="group block">
      <div className="bg-white rounded-2xl shadow-[0px_4px_4px_rgba(0,0,0,0.25)] p-6 flex flex-col gap-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
        {/* Avatar + Name + Course */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
            style={{ backgroundColor: "#B1E7D6" }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-xl font-bold" style={{ color: "#2B4257" }}>
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2
              className="font-bold text-lg truncate"
              style={{ color: "#2B4257" }}
            >
              {name}
            </h2>
            <p
              className="text-sm truncate"
              style={{ color: "#2B4257", opacity: 0.6 }}
            >
              {courseName ?? "No course assigned"}
            </p>
          </div>
        </div>

        {/* Lesson progress */}
        {hasCourse ? (
          <LessonProgressBar current={completedLessons} total={totalLessons} />
        ) : (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: "#B1E7D6", color: "#2B4257" }}
          >
            No course assigned yet
          </div>
        )}

        {/* Token icons */}
        {courseTokens.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {visibleTokens.map((token) =>
              earnedSet.has(token.id) ? (
                <TokenIcon
                  key={token.id}
                  iconUrl={token.icon_url}
                  title={token.title}
                  className="w-8 h-8"
                />
              ) : (
                <TokenMysteryStar key={token.id} size={32} />
              ),
            )}
            {remainingCount > 0 && (
              <span
                className="text-xs"
                style={{ color: "#2B4257", opacity: 0.5 }}
              >
                +{remainingCount} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
