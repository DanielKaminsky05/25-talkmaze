import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// remove assignment + sync TW
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("coach_student_assignments")
    .select("coach_id, student_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("coach_student_assignments")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: remaining } = await supabase
    .from("coach_student_assignments")
    .select("coach_id")
    .eq("student_id", assignment!.student_id);

  const teacherIds = (remaining ?? []).map(a => a.coach_id);
  const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
  await twClient.updateStudent(assignment!.student_id, {
    default_teachers: teacherIds.map(id => ({ id }))
  });

  return NextResponse.json({ success: true });
}