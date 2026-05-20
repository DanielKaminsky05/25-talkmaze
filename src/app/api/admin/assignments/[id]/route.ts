import { requireRole } from "@/src/lib/auth/server/requireRole";
import { NextRequest, NextResponse } from "next/server";

// remove assignment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;

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

  if (error) {
    console.error("DELETE assignment error", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
