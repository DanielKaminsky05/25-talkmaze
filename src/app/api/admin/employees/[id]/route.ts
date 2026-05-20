import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const employeeData = body.employee;

    const supabasePayload: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null } = {};

    if (employeeData.first_name !== undefined)
        supabasePayload.first_name = employeeData.first_name || null;
    if (employeeData.last_name !== undefined)
        supabasePayload.last_name = employeeData.last_name || null;
    if (employeeData.avatar_url !== undefined)
        supabasePayload.avatar_url = employeeData.avatar_url;

    if (Object.keys(supabasePayload).length > 0) {
      const { data: updated, error: supabaseError } = await supabase
        .from("coaches")
        .update(supabasePayload)
        .eq("id", id)
        .select()
        .single();

      if (supabaseError) {
        console.error("PUT employee supabase error", supabaseError);
        return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PUT employee error", err);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 },
    );
  }
}
