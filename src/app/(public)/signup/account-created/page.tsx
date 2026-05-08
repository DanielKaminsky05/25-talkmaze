import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default async function AccountCreatedPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;

  return (
    <div
      className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.1)] py-12 px-8 flex flex-col items-center gap-6">
        <Image
          src="/images/logos/talkmaze-logo-horizontal-color.svg"
          alt="TalkMaze Logo"
          width={150}
          height={120}
          className="h-[100px] w-auto object-contain"
          priority
        />

        <div className="text-center flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#1F2E3B]">
            Account created!
          </h1>
          <p className="text-sm text-[#1F2E3B]/60">
            You can subscribe now to get started, or explore your account first
            and pay later.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href={studentId ? `/payments?studentId=${studentId}` : "/payments"}
            className="w-full h-12 bg-[#B1E7D6] rounded-xl text-[18px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            Continue to payment
          </Link>
          <Link
            href="/profiles"
            className="w-full h-12 border border-[#1F2E3B]/20 rounded-xl text-[18px] font-semibold text-[#1F2E3B] hover:bg-[#1F2E3B]/5 transition-colors flex items-center justify-center"
          >
            Go to my account
          </Link>
        </div>
      </div>
    </div>
  );
}
