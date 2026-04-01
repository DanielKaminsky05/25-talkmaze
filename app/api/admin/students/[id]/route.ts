import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const studentData = body.student;

    const supabase = await createClient();

    const supabasePayload: Record<string, unknown> = {};

    if (studentData.first_name !== undefined)
      supabasePayload.first_name = studentData.first_name;
    if (studentData.last_name !== undefined)
      supabasePayload.last_name = studentData.last_name;
    if (studentData.grade !== undefined)
      supabasePayload.grade = String(studentData.grade);
    if (studentData.avatar_url !== undefined)
        supabasePayload.avatar_url = studentData.avatar_url;

    if (Object.keys(supabasePayload).length > 0) {
      const { data: updated, error: supabaseError } = await supabase
        .from("students")
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
