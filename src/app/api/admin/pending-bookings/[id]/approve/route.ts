import { NextRequest, NextResponse } from "next/server";
import { approvePendingBookedSlot } from "@/src/lib/scheduling/server/matchmaking";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await approvePendingBookedSlot(id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to approve pending booking" },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result);
}
