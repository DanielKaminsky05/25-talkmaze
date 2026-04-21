import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const employeeData = body.employee;

    const supabase = await createClient();

    const supabasePayload: Record<string, unknown> = {};

    if (employeeData.first_name !== undefined || employeeData.last_name !== undefined) {
        supabasePayload.name = `${employeeData.first_name || ""} ${employeeData.last_name || ""}`.trim();
    }
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
