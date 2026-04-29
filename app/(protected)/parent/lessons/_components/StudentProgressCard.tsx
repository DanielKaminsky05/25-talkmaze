import Link from "next/link";
import Image from "next/image";
import LessonProgressBar from "../../../components/LessonProgressBar";
import { TokenIcon } from "../../../components/TokenIcon";
import { TokenMysteryStar } from "../../../components/TokenMysteryStar";

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
}: StudentProgressCardProps) {
  const earnedSet = new Set(earnedTokenIds);
  const visibleTokens = courseTokens.slice(0, MAX_TOKENS_SHOWN);
  const remainingCount = Math.max(0, courseTokens.length - MAX_TOKENS_SHOWN);
  const hasCourse = !!courseName && totalLessons > 0;

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
                <TokenMysteryStar key={token.id} className="w-8 h-8" />
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
