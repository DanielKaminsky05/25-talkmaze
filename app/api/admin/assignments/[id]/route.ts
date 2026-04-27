import { createClient } from "@/services/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// remove assignment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Parse the synthetic composite ID
  const [coach_id, student_id] = id.split("_");

  if (!coach_id || !student_id) {
    return NextResponse.json({ error: "Invalid assignment ID format" }, { status: 400 });
  }

  // Delete from junction table
  const { error } = await supabase
    .from("coach_students")
    .delete()
    .eq("coach_id", coach_id)
    .eq("student_id", student_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
