export default function PageSpinner() {
  return (
    <div className="flex items-center justify-center w-full min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#B1E7D6] border-t-[#65CFAD] rounded-full animate-spin" />
    </div>
  );
}
