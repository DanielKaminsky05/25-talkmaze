import Spinner from "./Spinner";

export default function PageSpinner() {
  return (
    <div className="flex items-center justify-center w-full min-h-[60vh]">
      <Spinner className="size-12 border-4 border-[#B1E7D6] border-t-[#65CFAD]" />
    </div>
  );
}
