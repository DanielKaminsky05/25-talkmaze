import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await params;
    const body = await req.json();
    const { title, description, content_url } = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: "Lesson title cannot be empty" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const payload: Record<string, unknown> = {};
    if (title !== undefined)       payload.title       = title.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (content_url !== undefined) payload.content_url = content_url?.trim() || null;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lessons")
      .update(payload)
      .eq("id", lessonId)
      .eq("course_id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("course_id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete lesson" },
      { status: 500 }
    );
  }
}