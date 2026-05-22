/**
 * Display this component as a placeholder for badges that are not unlocked yet.
 */
export default function LockedBadge() {
  return (
    <div className="relative group">
      <div className="rounded-xl overflow-hidden bg-white/20 p-2 shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-white/40 hover:-translate-y-1 w-full">
        <div
          aria-label="Locked badge"
          className="w-full aspect-square rounded-lg border border-white/60 bg-[#a4a4a8] flex items-center justify-center"
        >
          <span className="text-sm sm:text-base md:text-xl font-semibold tracking-[0.03em] text-white/80">
            LOCKED
          </span>
        </div>
      </div>
    </div>
  );
}
