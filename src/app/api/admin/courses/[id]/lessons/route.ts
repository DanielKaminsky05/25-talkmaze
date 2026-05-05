import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch lessons" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body) {
      return NextResponse.json({
        status: 404,
        message: "Unable to get user inputted fields",
      });
    }

    const {
      lesson_id,
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

    if (!lesson_id) {
      return NextResponse.json({ status: 404, message: "Lesson id not found" });
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Lesson title is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      lesson_id.slice(0, 8);

    const slide_show_url = slide_pdf_name
      ? `course_files/${id}/${lesson_id}/lessons/${slide_pdf_name}`
      : null;
    const slide_pptx_url = slide_pptx_name
      ? `course_files/${id}/${lesson_id}/lessons/${slide_pptx_name}`
      : null;

    const { data, error } = await supabase
      .from("lessons")
      .insert({
        id: lesson_id,
        course_id: id,
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        content_url: content_url?.trim() || null,
        slide_show_url,
        slide_pptx_url,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Insert lesson_tasks rows for admin defaults (student_id = null)
    const preFileUrl = pre_file_name
      ? `course_files/${id}/${lesson_id}/pre_lesson_tasks/${pre_file_name}`
      : null;
    const postFileUrl = post_file_name
      ? `course_files/${id}/${lesson_id}/post_lesson_tasks/${post_file_name}`
      : null;

    if (preFileUrl || pre_lesson_description) {
      await supabase.from("lesson_tasks").insert({
        lesson_id,
        student_id: null,
        type: "pre",
        file_url: preFileUrl,
        description: pre_lesson_description || null,
      });
    }

    if (postFileUrl || post_lesson_description) {
      await supabase.from("lesson_tasks").insert({
        lesson_id,
        student_id: null,
        type: "post",
        file_url: postFileUrl,
        description: post_lesson_description || null,
      });
    }

    // Create a token row for this lesson so the admin can upload an icon immediately
    await supabase.from("tokens").insert({
      lesson_id: lesson_id,
      title: title.trim(),
      code: lesson_id.slice(0, 8).toUpperCase(),
    });

    //now need to update the lesson head and tail

    //make sure the course is not empty

    console.log("making sure the course is not empty");
    const { data: checkCourseData, error: checkCourseDataError } =
      await supabase
        .from("courses")
        .select("head_lesson_id")
        .eq("id", id)
        .single();

    if (checkCourseDataError) {
      return NextResponse.json({
        status: 404,
        message: "Unable to verify head of course",
      });
    }

    console.log(
      "Results from checking the courses: " +
        JSON.stringify(checkCourseData?.head_lesson_id),
    );

    if (checkCourseData.head_lesson_id == null) {
      const { data: update_tail, error: update_tail_error } = await supabase
        .from("courses")
        .update({ head_lesson_id: lesson_id, tail_lesson_id: lesson_id })
        .eq("id", id);
    } else {
      //first find the previous tail

      const { data: tail_data, error: tail_data_error } = await supabase
        .from("courses")
        .select("tail_lesson_id")
        .eq("id", id)
        .single();

      if (!tail_data) {
        return NextResponse.json({
          status: 500,
          message: "Error retrieving tail of course",
        });
      }
      console.log("Retrieved current tail: " + tail_data.tail_lesson_id);
      if (!tail_data.tail_lesson_id) {
        return NextResponse.json({
          status: 500,
          message: "Tail lesson id is null",
        });
      }
      const { data: update_tail, error: update_tail_error } = await supabase
        .from("courses")
        .update({ tail_lesson_id: lesson_id })
        .eq("id", id);
      //update the next lesson of the previous
      const { data: update_lesson_prev_data, error: update_lesson_prev_error } =
        await supabase
          .from("lessons")
          .update({ prev_lesson: tail_data.tail_lesson_id })
          .eq("id", lesson_id);
      const { data: update_next_lesson_data, error: update_next_lesson_error } =
        await supabase
          .from("lessons")
          .update({ next_lesson: lesson_id })
          .eq("id", tail_data.tail_lesson_id);

      console.log(
        "After inserting new lesson and updating order: " +
          JSON.stringify(update_tail),
      );
    }

    //now need to make sure the next and prev_lessons are updated

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create lesson" },
      { status: 500 },
    );
  }
}
