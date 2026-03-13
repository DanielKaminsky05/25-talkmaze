import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// remove assignment + sync TW
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

  // Find remaining coaches for this student to sync with Teachworks
  const { data: remaining } = await supabase
    .from("coach_students")
    .select("coach_id")
    .eq("student_id", student_id);

  const remainingCoachIds = (remaining ?? []).map((a) => a.coach_id);

  if (remainingCoachIds.length > 0) {
    // Look up tw_ids for remaining default teachers
    const { data: twCoaches } = await supabase
      .from("coaches")
      .select("tw_id")
      .in("id", remainingCoachIds)
      .not("tw_id", "is", null);

    const twTeacherIds = (twCoaches ?? []).map((c) => ({ id: Number(c.tw_id) }));
    
    try {
      const { data: studentData } = await supabase.from('students').select('tw_id').eq('id', student_id).single();
      const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
      if (studentData && studentData.tw_id) {
        await twClient.updateStudent(studentData.tw_id, {
          default_teachers: twTeacherIds
        });
      }
    } catch (e) {
      console.error("Teachworks sync failed: ", e);
    }
  } else {
    // If no remaining coaches, clear default teachers
    try {
      const { data: studentData } = await supabase.from('students').select('tw_id').eq('id', student_id).single();
      const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
      if (studentData && studentData.tw_id) {
        await twClient.updateStudent(studentData.tw_id, {
          default_teachers: []
        });
      }
    } catch (e) {
      console.error("Teachworks sync failed: ", e);
    }
  }

  return NextResponse.json({ success: true });
}