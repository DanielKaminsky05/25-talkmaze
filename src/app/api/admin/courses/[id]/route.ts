import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const courseData = body.course ?? {};

    const payload: { title?: string; description?: string | null } = {};
    if (courseData.name !== undefined) payload.title = courseData.name;
    else if (courseData.title !== undefined) payload.title = courseData.title;
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
        console.error("PUT course supabase error", error);
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
      }
      return NextResponse.json(updated);
    }

    return NextResponse.json(payload);
  } catch (err: unknown) {
    console.error("PUT course error", err);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { id } = await params;

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      console.error("DELETE course supabase error", error);
      return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE course error", err);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 },
    );
  }
}
