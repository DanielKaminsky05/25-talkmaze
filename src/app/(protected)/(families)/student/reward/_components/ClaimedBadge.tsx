import type { EarnedBadge } from "../_hooks/useRewardData";
import { Button } from "@/src/components/ui/button";

type ClaimedBadgeProps = {
  badge: EarnedBadge;
};

type ClaimBadgeModalProps = {
  badge: EarnedBadge;
  onClose: () => void;
  onRedeem: () => void;
};

/**
 * Display a student's earned course completion badge 
 */
export default function ClaimedBadge({ badge }: ClaimedBadgeProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-white/20 p-2 shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-white/40 hover:-translate-y-1">
      <img
        src={badge.badge.image_url ?? ""}
        alt={badge.badge.title}
        className="w-full h-auto object-contain rounded-lg aspect-square"
      />
    </div>
  );
}

/**
 * Modal shown when a student taps an unclaimed earned badge.
 */
export function ClaimBadgeModal({
  badge,
  onClose,
  onRedeem,
}: ClaimBadgeModalProps) {
  return (
    <div
      className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#d2c9f8] rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-2xl font-bold text-[#2B4257]">Congratulations!</p>
        {badge.badge.image_url && (
          <img
            src={badge.badge.image_url}
            className="w-32 h-32 object-contain"
            alt={badge.badge.title}
          />
        )}
        <p className="text-[#2B4257] text-center">
          You&apos;ve earned the <strong>{badge.badge.title}</strong> badge!
        </p>
        <div className="grid grid-cols-2 gap-3 mt-2 w-full">
          <button
            onClick={onClose}
            className="w-full h-11 inline-flex items-center justify-center border border-[#2B4257] text-[#2B4257] font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Later
          </button>
          <Button
            onClick={onRedeem}
            variant="dark"
            size="lg"
            className="w-full text-accent font-bold transition-transform hover:scale-105"
          >
            Redeem
          </Button>
        </div>
      </div>
    </div>
  );
}
