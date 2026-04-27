interface StudentAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-10 w-10 text-base",
  md: "h-14 w-14 text-xl",
  lg: "h-16 w-16 text-2xl",
};

export default function StudentAvatar({
  firstName,
  lastName,
  size = "lg",
}: StudentAvatarProps) {
  const initial = (firstName || lastName || "?").charAt(0).toUpperCase();

  return (
    <div
      className={`${SIZE_CLASSES[size]} bg-[#2B4257] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none`}
    >
      {initial}
    </div>
  );
}
