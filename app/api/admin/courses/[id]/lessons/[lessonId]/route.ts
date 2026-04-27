import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  try {
    const { id, lessonId } = await params;
    const body = await req.json();
    const {
      title,
      description,
      content_url,
      pre_file_name,
      post_file_name,
      slide_pdf_name,
      slide_pptx_name,
      pre_lesson_description,
      post_lesson_description,
    } = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: "Lesson title cannot be empty" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = title.trim();
    if (description !== undefined)
      payload.description = description?.trim() || null;
    if (content_url !== undefined)
      payload.content_url = content_url?.trim() || null;
    if (pre_file_name !== undefined)
      payload.pre_lesson_url = pre_file_name
        ? `course_files/${id}/${lessonId}/pre_lesson_tasks/${pre_file_name}`
        : null;
    if (post_file_name !== undefined)
      payload.post_lesson_url = post_file_name
        ? `course_files/${id}/${lessonId}/post_lesson_tasks/${post_file_name}`
        : null;
    if (slide_pdf_name !== undefined)
      payload.slide_show_url = slide_pdf_name
        ? `course_files/${id}/${lessonId}/lessons/${slide_pdf_name}`
        : null;
    if (slide_pptx_name !== undefined)
      payload.slide_pptx_url = slide_pptx_name
        ? `course_files/${id}/${lessonId}/lessons/${slide_pptx_name}`
        : null;
    if (pre_lesson_description !== undefined)
      payload.pre_lesson_description = pre_lesson_description || null;
    if (post_lesson_description !== undefined)
      payload.post_lesson_description = post_lesson_description || null;
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("lessons")
      .update(payload)
      .eq("id", lessonId)
      .eq("course_id", id)
      .select()
      .single();

    console.log("Put data: " + JSON.stringify(data));

    if (error) throw new Error(error.message);
    if (!data)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update lesson" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  try {
    const { id, lessonId } = await params;
    const supabase = await createClient();

    // Fetch linked-list pointers and file URLs before deletion
    const { data: lessonData, error: lessonFetchError } = await supabase
      .from("lessons")
      .select(
        "next_lesson, prev_lesson, pre_lesson_url, post_lesson_url, slide_show_url, slide_pptx_url",
      )
      .eq("id", lessonId)
      .single();

    if (lessonFetchError) {
      return NextResponse.json({
        status: 500,
        message: "Unable to fetch lesson before deletion",
      });
    }

    if (lessonData) {
      // Patch course head/tail BEFORE deleting the lesson row.
      // courses.head_lesson_id and courses.tail_lesson_id are FK-constrained to
      // lessons.id, so deleting the row while either pointer still references it
      // causes a FK violation.
      const courseUpdate: Record<string, string | null> = {};
      if (lessonData.prev_lesson == null)
        courseUpdate.head_lesson_id = lessonData.next_lesson;
      if (lessonData.next_lesson == null)
        courseUpdate.tail_lesson_id = lessonData.prev_lesson;
      if (Object.keys(courseUpdate).length > 0) {
        const { error: courseUpdateError } = await supabase
          .from("courses")
          .update(courseUpdate)
          .eq("id", id);
        if (courseUpdateError) throw new Error(courseUpdateError.message);
      }

      // Patch sibling pointers before deleting
      if (lessonData.prev_lesson != null) {
        const { error: prevUpdateError } = await supabase
          .from("lessons")
          .update({ next_lesson: lessonData.next_lesson })
          .eq("id", lessonData.prev_lesson);
        if (prevUpdateError) throw new Error(prevUpdateError.message);
      }

      if (lessonData.next_lesson != null) {
        const { error: nextUpdateError } = await supabase
          .from("lessons")
          .update({ prev_lesson: lessonData.prev_lesson })
          .eq("id", lessonData.next_lesson);
        if (nextUpdateError) throw new Error(nextUpdateError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("course_id", id);

    if (deleteError) throw new Error(deleteError.message);

    if (lessonData) {
      // Delete storage files (strip the 'course_files/' bucket prefix from stored paths)
      const filePaths = [
        lessonData.pre_lesson_url,
        lessonData.post_lesson_url,
        lessonData.slide_show_url,
        lessonData.slide_pptx_url,
      ]
        .filter((p): p is string => Boolean(p))
        .map((p) => p.replace(/^course_files\//, ""));

      if (filePaths.length > 0) {
        await supabase.storage.from("course_files").remove(filePaths);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete lesson" },
      { status: 500 },
    );
  }
}
