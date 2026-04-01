import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const courseData = body.course;

    const supabase = await createClient();

    const payload: Record<string, unknown> = {};
    if (courseData.name !== undefined)        payload.name        = courseData.name;
    if (courseData.description !== undefined) payload.description = courseData.description;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from("courses")
        .update(payload)
        .eq("tw_course_id", id);
      if (error) console.error("Supabase sync failed:", error.message);
    }
    
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update course" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    console.log("ID passed to delete function: " + id);
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq('id', id);
    if (error) console.error("Supabase sync failed:", error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete course" },
      { status: 500 }
    );
  }
}