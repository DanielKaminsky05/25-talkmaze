import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const employeeData = body.employee;

    const supabase = await createClient();

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
        console.error("Supabase update failed:", supabaseError.message);
        return NextResponse.json({ error: supabaseError.message }, { status: 500 });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: "No changes provided" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
