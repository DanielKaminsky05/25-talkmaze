import type { EarnedBadge } from "../_hooks/useRewardData";

type GlowingBadgeProps = {
  badge: EarnedBadge;
  onClaim: () => void;
};

const glowRingGradient =
  "conic-gradient(from 0deg, rgba(255,244,191,0.9), rgba(255,216,111,0.95), rgba(255,232,158,0.9), rgba(255,197,82,0.95), rgba(255,244,191,0.9))";

const auraGradient =
  "radial-gradient(circle at center, rgba(255,236,166,0.62) 0%, rgba(255,213,112,0.4) 34%, rgba(255,197,82,0.24) 56%, rgba(255,197,82,0) 80%)";

/**
 * Display a glowing ring and soft radiating aura around newly earned badges.
 */
export default function GlowingBadge({ badge, onClaim }: GlowingBadgeProps) {
  return (
    <div
      onClick={onClaim}
      className="group relative cursor-pointer transition-transform duration-300 hover:scale-105"
    >
      {/* Aura behind the badge to create a soft radiating light effect. */}
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[20px] blur-xl opacity-60"
        style={{ background: auraGradient }}
      />
      <div
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[18px] blur-md opacity-70 animate-pulse"
        style={{
          background: auraGradient,
          animationDuration: "3.8s",
        }}
      />

      <div className="relative overflow-hidden rounded-xl p-0.5">
        {/* Glowing ring fitted to the badge boundary. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl animate-spin"
          style={{
            animationDuration: "11s",
            background: glowRingGradient,
            opacity: 0.72,
          }}
        />

        <div className="relative z-10 overflow-hidden rounded-[10px] bg-black/5">
          <img
            src={badge.badge.image_url ?? ""}
            alt={badge.badge.title}
            className="w-full aspect-square object-contain"
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[10px]"
            style={{ boxShadow: "inset 0 0 20px rgba(255, 224, 137, 0.26)" }}
          />
        </div>
      </div>
    </div>
  );
}
