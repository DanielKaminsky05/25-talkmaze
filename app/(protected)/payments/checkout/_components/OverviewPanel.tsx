export function OverviewPanel({
  planName,
  amountDisplay,
}: {
  planName: string;
  amountDisplay: string;
}) {
  return (
    <div className="flex flex-col w-full gap-5 bg-[#1f2e3b] rounded-xl border-[0.5px] border-black shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-8 text-white">
      <h1 className="text-2xl font-bold mb-0">Overview</h1>
      <div className="flex flex-col self-center w-full max-w-[500px] relative bg-[#b1e7d6] rounded-xl p-6 text-[#1f2e3b]">
        <h2 className="text-2xl font-bold mt-0 mb-2.5 text-[#1f2e3b]">
          TalkMaze Package Renewal:
        </h2>
        <div className="flex justify-center items-center gap-1.5 bg-white rounded-lg p-5 mt-[15px] shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] text-xl">
          <span>{planName}</span>
          <span>|</span>
          <span className="font-bold text-black">{amountDisplay} (CA)</span>
        </div>
        <div className="mt-[15px] text-base underline cursor-pointer text-[#1f2e3b]">
          See more details
        </div>
      </div>

      <div className="mt-auto flex justify-between items-center bg-white rounded-lg p-[15px] text-black text-base font-semibold">
        <span>
          Billing History{" "}
          <span className="font-normal text-[#666] text-xs">expand</span>
        </span>
      </div>
    </div>
  );
}
