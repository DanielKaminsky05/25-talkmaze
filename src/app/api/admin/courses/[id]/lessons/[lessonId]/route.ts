import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminStorage() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ).storage.from("course_files");
}

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
    if (slide_pdf_name !== undefined)
      payload.slide_show_url = slide_pdf_name
        ? `course_files/${id}/${lessonId}/lessons/${slide_pdf_name}`
        : null;
    if (slide_pptx_name !== undefined)
      payload.slide_pptx_url = slide_pptx_name
        ? `course_files/${id}/${lessonId}/lessons/${slide_pptx_name}`
        : null;
    if (Object.keys(payload).length === 0 && pre_file_name === undefined && post_file_name === undefined && pre_lesson_description === undefined && post_lesson_description === undefined) {
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

    // Upsert lesson_tasks admin defaults (student_id = null) for pre/post
    if (pre_file_name !== undefined || pre_lesson_description !== undefined) {
      const preFileUrl = pre_file_name
        ? `course_files/${id}/${lessonId}/pre_lesson_tasks/${pre_file_name}`
        : null;
      const preDesc = pre_lesson_description !== undefined ? (pre_lesson_description || null) : undefined;

      // Fetch existing default pre task to get its id for upsert
      const { data: existingPre } = await supabase
        .from("lesson_tasks")
        .select("id, file_url")
        .eq("lesson_id", lessonId)
        .is("student_id", null)
        .eq("type", "pre")
        .maybeSingle();

      const preUpdate = {
        lesson_id: lessonId,
        student_id: null as null,
        type: "pre" as const,
        updated_at: new Date().toISOString(),
        ...(pre_file_name !== undefined ? { file_url: preFileUrl } : {}),
        ...(preDesc !== undefined ? { description: preDesc } : {}),
      };

      if (existingPre) {
        await supabase
          .from("lesson_tasks")
          .update(preUpdate)
          .eq("id", existingPre.id);

        // Delete old storage file if replaced
        if (pre_file_name !== undefined && preFileUrl && existingPre.file_url && existingPre.file_url !== preFileUrl) {
          const oldPath = existingPre.file_url.replace(/^course_files\//, "");
          await adminStorage().remove([oldPath]);
        }
      } else {
        await supabase.from("lesson_tasks").insert(preUpdate);
      }
    }

    if (post_file_name !== undefined || post_lesson_description !== undefined) {
      const postFileUrl = post_file_name
        ? `course_files/${id}/${lessonId}/post_lesson_tasks/${post_file_name}`
        : null;
      const postDesc = post_lesson_description !== undefined ? (post_lesson_description || null) : undefined;

      const { data: existingPost } = await supabase
        .from("lesson_tasks")
        .select("id, file_url")
        .eq("lesson_id", lessonId)
        .is("student_id", null)
        .eq("type", "post")
        .maybeSingle();

      const postUpdate = {
        lesson_id: lessonId,
        student_id: null as null,
        type: "post" as const,
        updated_at: new Date().toISOString(),
        ...(post_file_name !== undefined ? { file_url: postFileUrl } : {}),
        ...(postDesc !== undefined ? { description: postDesc } : {}),
      };

      if (existingPost) {
        await supabase
          .from("lesson_tasks")
          .update(postUpdate)
          .eq("id", existingPost.id);

        if (post_file_name !== undefined && postFileUrl && existingPost.file_url && existingPost.file_url !== postFileUrl) {
          const oldPath = existingPost.file_url.replace(/^course_files\//, "");
          await adminStorage().remove([oldPath]);
        }
      } else {
        await supabase.from("lesson_tasks").insert(postUpdate);
      }
    }

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

    // Fetch linked-list pointers and slide file URLs before deletion
    const { data: lessonData, error: lessonFetchError } = await supabase
      .from("lessons")
      .select(
        "next_lesson, prev_lesson, slide_show_url, slide_pptx_url",
      )
      .eq("id", lessonId)
      .single();

    if (lessonFetchError) {
      return NextResponse.json({
        status: 500,
        message: "Unable to fetch lesson before deletion",
      });
    }

    // Fetch all lesson_tasks for this lesson (admin defaults + all overrides)
    const { data: taskRows } = await supabase
      .from("lesson_tasks")
      .select("file_url")
      .eq("lesson_id", lessonId);

    if (lessonData) {
      // Patch course head/tail BEFORE deleting the lesson row.
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
      // Delete slide storage files
      const slideFilePaths = [
        lessonData.slide_show_url,
        lessonData.slide_pptx_url,
      ]
        .filter((p): p is string => Boolean(p))
        .map((p) => p.replace(/^course_files\//, ""));

      // Delete all lesson_tasks storage files (admin defaults + overrides)
      const taskFilePaths = (taskRows ?? [])
        .map((t) => t.file_url)
        .filter((p): p is string => Boolean(p))
        .map((p) => p.replace(/^course_files\//, ""));

      const allPaths = [...slideFilePaths, ...taskFilePaths];
      if (allPaths.length > 0) {
        await adminStorage().remove(allPaths);
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
