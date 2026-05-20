import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";
export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase.from('coaches').select("*");

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("GET employees error", err);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
