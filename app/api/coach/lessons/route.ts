import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: filter progress by student
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    // Fetch all lessons with their course title
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select(`
        id,
        title,
        description,
        content_url,
        created_at,
        updated_at,
        courses(id, title)
      `)
      .order("created_at", { ascending: false });

    if (lessonsError) {
      console.error("Lessons query error:", lessonsError);
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    // If a studentId is given, fetch their lesson_progress records
    if (studentId) {
      const { data: progressRows, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status, completed_at, coach_notes")
        .eq("student_id", studentId);

      if (progressError) {
        console.error("Progress query error:", progressError);
        return NextResponse.json({ error: progressError.message }, { status: 500 });
      }

      // Build a map for O(1) lookups - cast to any to bypass stale type generation
      const progressMap = new Map((progressRows as any[]).map((p: any) => [p.lesson_id, p]));

      // Attach progress to each lesson (null means not started)
      const lessonsWithProgress = lessons.map(lesson => ({
        ...lesson,
        progress: progressMap.get(lesson.id) ?? null,
      }));

      return NextResponse.json(lessonsWithProgress);
    }

    return NextResponse.json(lessons);

  } catch (error) {
    console.error("Error in /api/coach/lessons:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
