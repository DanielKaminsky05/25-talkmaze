import { NextRequest, NextResponse } from "next/server";
import { TeachworksClient } from "@/lib/teachworks/client";
import { createClient } from "@/utils/supabase/server";

const client = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const studentData = body.student;

    const updated = await client.updateStudent(id, studentData);
    const supabase = await createClient();

    const supabasePayload: Record<string, unknown> = {};

    if (studentData.first_name !== undefined)
      supabasePayload.first_name = studentData.first_name;
    if (studentData.last_name !== undefined)
      supabasePayload.last_name = studentData.last_name;
    if (studentData.birth_date !== undefined)
      supabasePayload.birth_date = studentData.birth_date;
    if (studentData.status !== undefined)
      supabasePayload.status = studentData.status;
    if (studentData.email !== undefined)
      supabasePayload.email = studentData.email;
    if (studentData.mobile_phone !== undefined)
      supabasePayload.mobile_phone = studentData.mobile_phone;
    if (studentData.home_phone !== undefined)
      supabasePayload.home_phone = studentData.home_phone;
    if (studentData.school !== undefined)
      supabasePayload.school = studentData.school;
    if (studentData.grade !== undefined)
      supabasePayload.grade = studentData.grade;

    if (Object.keys(supabasePayload).length > 0) {
      const { error: supabaseError } = await supabase
        .from("students")
        .update(supabasePayload)
        .eq("tw_student_id", id);

      if (supabaseError) {
        console.error("Supabase sync failed:", supabaseError.message);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
