import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const courseData = body.course;

    const supabase = await createClient();

    const payload: { title?: string; description?: string | null } = {};
    if (courseData.name !== undefined) payload.title = courseData.name;
    if (courseData.description !== undefined)
      payload.description = courseData.description;

    if (Object.keys(payload).length > 0) {
      const { data: updated, error } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("Supabase update failed:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update course" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    console.log("ID passed to delete function: " + id);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete course" },
      { status: 500 },
    );
  }
}
