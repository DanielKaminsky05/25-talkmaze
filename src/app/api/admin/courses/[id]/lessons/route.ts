import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";

const ParamsSchema = z.object({ id: z.string().uuid() }).strict();

const PostBodySchema = z
  .object({
    lesson_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    content_url: z.string().optional(),
    pre_file_name: z.string().optional(),
    post_file_name: z.string().optional(),
    slide_pdf_name: z.string().optional(),
    slide_pptx_name: z.string().optional(),
    pre_lesson_description: z.string().optional(),
    post_lesson_description: z.string().optional(),
  })
  .strict();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, description, content_url, slug, course_id, created_at, slide_show_url, slide_pptx_url, prev_lesson, next_lesson")
      .eq("course_id", parsed.data.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("admin/courses/[id]/lessons GET error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return NextResponse.json({ lessons: data ?? [] });
  } catch (err: unknown) {
    console.error("admin/courses/[id]/lessons GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid request parameters", details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }
  const parsedBody = PostBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const courseId = parsedParams.data.id;
  const data = parsedBody.data;
  const title = data.title.trim();
  if (!title) {
    return NextResponse.json(
      { error: "Lesson title is required" },
      { status: 400 },
    );
  }

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    data.lesson_id.slice(0, 8);

  const slide_show_url = data.slide_pdf_name
    ? `course_files/${courseId}/${data.lesson_id}/lessons/${data.slide_pdf_name}`
    : null;
  const slide_pptx_url = data.slide_pptx_name
    ? `course_files/${courseId}/${data.lesson_id}/lessons/${data.slide_pptx_name}`
    : null;

  try {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .insert({
        id: data.lesson_id,
        course_id: courseId,
        title,
        slug,
        description: data.description?.trim() || null,
        content_url: data.content_url?.trim() || null,
        slide_show_url,
        slide_pptx_url,
      })
      .select("id, title, description, content_url, slug, course_id, created_at, slide_show_url, slide_pptx_url")
      .single();

    if (error) {
      console.error("admin/courses/[id]/lessons POST insert error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    // Admin-default lesson_tasks rows (student_id = null).
    const preFileUrl = data.pre_file_name
      ? `course_files/${courseId}/${data.lesson_id}/pre_lesson_tasks/${data.pre_file_name}`
      : null;
    const postFileUrl = data.post_file_name
      ? `course_files/${courseId}/${data.lesson_id}/post_lesson_tasks/${data.post_file_name}`
      : null;

    if (preFileUrl || data.pre_lesson_description) {
      await supabase.from("lesson_tasks").insert({
        lesson_id: data.lesson_id,
        student_id: null,
        type: "pre",
        file_url: preFileUrl,
        description: data.pre_lesson_description || null,
      });
    }
    if (postFileUrl || data.post_lesson_description) {
      await supabase.from("lesson_tasks").insert({
        lesson_id: data.lesson_id,
        student_id: null,
        type: "post",
        file_url: postFileUrl,
        description: data.post_lesson_description || null,
      });
    }

    // Token row so the admin can upload an icon right after creation.
    await supabase.from("tokens").insert({
      lesson_id: data.lesson_id,
      title,
      code: data.lesson_id.slice(0, 8).toUpperCase(),
    });

    // Linked-list head/tail pointer maintenance. TODO: extract to
    // src/lib/lessons/server/insertLessonAtTail() — this is the cautionary
    // tale called out in docs/api-contract.md §domain-logic-placement.
    const { data: course, error: courseLookupError } = await supabase
      .from("courses")
      .select("head_lesson_id, tail_lesson_id")
      .eq("id", courseId)
      .maybeSingle();

    if (courseLookupError || !course) {
      console.error(
        "admin/courses/[id]/lessons POST: course pointer lookup failed",
        courseLookupError,
      );
      return NextResponse.json({ lesson }, { status: 201 });
    }

    if (course.head_lesson_id == null) {
      await supabase
        .from("courses")
        .update({ head_lesson_id: data.lesson_id, tail_lesson_id: data.lesson_id })
        .eq("id", courseId);
    } else if (course.tail_lesson_id) {
      await supabase
        .from("courses")
        .update({ tail_lesson_id: data.lesson_id })
        .eq("id", courseId);
      await supabase
        .from("lessons")
        .update({ prev_lesson: course.tail_lesson_id })
        .eq("id", data.lesson_id);
      await supabase
        .from("lessons")
        .update({ next_lesson: data.lesson_id })
        .eq("id", course.tail_lesson_id);
    }

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err: unknown) {
    console.error("admin/courses/[id]/lessons POST error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
