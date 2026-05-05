import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";
import type { Database } from "@/src/services/supabase/types/database";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type LessonTask = Database["public"]["Tables"]["lesson_tasks"]["Row"];

type OrganizedLessons = {
  course_id: string;
  course_name: string;
  lessons: Lesson[];
  status: number[];
  pre_lesson_urls: (string | null)[];
  post_lesson_urls: (string | null)[];
  slide_show_inputs: (string | null)[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  console.log("Inside get lessons for coach");
  const { studentId } = await params;

  const supabase = await createClient();

  const { data: assigned_courses, error: assigned_courses_error } =
    await supabase
      .from("course_assignment")
      .select("course_id")
      .eq("student_id", studentId);

  if (assigned_courses_error) {
    console.log("error getting assigned courses ", assigned_courses_error);
    return NextResponse.json({
      status: 500,
      message: "Error retrieving courses assigned to student",
    });
  }

  console.log(
    "Retrieved assigned courses: " + JSON.stringify(assigned_courses),
  );

  let response = [];
  for (let i = 0; i < assigned_courses.length; i++) {
    const course_id = assigned_courses[i].course_id;

    if (!course_id) continue;

    const { data: courseHeadData, error: courseHeadError } = await supabase
      .from("courses")
      .select("head_lesson_id,title")
      .eq("id", course_id)
      .single();

    const { data: allLessonsData, error: allLessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", course_id);

    if (allLessonsError) {
      return NextResponse.json(
        "Error getting all lessons of associated course " + course_id,
      );
    }

    const { data: statusData, error: statusDataError } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", studentId);

    if (statusDataError) {
      return NextResponse.json({
        status: 500,
        message: "Unable to fetch the statuses of the lessons",
      });
    }

    // Fetch all lesson_tasks for this student (their overrides + admin defaults)
    const lessonIds = (allLessonsData ?? []).map((l) => l.id);
    let tasksByLesson: Map<string, LessonTask[]> = new Map();

    if (lessonIds.length > 0) {
      const { data: tasksData } = await supabase
        .from("lesson_tasks")
        .select("*")
        .in("lesson_id", lessonIds)
        .or(`student_id.eq.${studentId},student_id.is.null`);

      for (const task of tasksData ?? []) {
        const existing = tasksByLesson.get(task.lesson_id) ?? [];
        existing.push(task);
        tasksByLesson.set(task.lesson_id, existing);
      }
    }

    let lesson_ordered: OrganizedLessons = {
      course_id: course_id,
      course_name: courseHeadData?.title ? courseHeadData.title : "",
      lessons: [],
      status: [],
      pre_lesson_urls: [],
      post_lesson_urls: [],
      slide_show_inputs: [],
    };

    const head_lesson = allLessonsData?.find(
      (lesson) => lesson.id === courseHeadData?.head_lesson_id,
    );

    const orderedLessons = head_lesson
      ? null
      : [...(allLessonsData ?? [])].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

    let current_lesson = head_lesson ?? orderedLessons?.shift();
    let remainingFallback = orderedLessons;

    while (current_lesson) {
      const status = statusData.find(
        (statusObj) => statusObj.lesson_id === current_lesson?.id,
      )?.status;

      lesson_ordered.lessons.push(current_lesson);

      if (status) {
        lesson_ordered.status.push(status);
      } else {
        lesson_ordered.status.push(1);
      }

      // Resolve slide show URL
      if (current_lesson.slide_show_url) {
        const file = await getFileFromCloud(current_lesson.slide_show_url);
        lesson_ordered.slide_show_inputs.push(file);
      } else {
        lesson_ordered.slide_show_inputs.push(null);
      }

      // Resolve effective pre/post task URLs using student override → admin default priority
      const lessonTasks = tasksByLesson.get(current_lesson.id) ?? [];

      const effectivePre =
        lessonTasks.find((t) => t.type === "pre" && t.student_id === studentId) ??
        lessonTasks.find((t) => t.type === "pre" && t.student_id === null);

      const effectivePost =
        lessonTasks.find((t) => t.type === "post" && t.student_id === studentId) ??
        lessonTasks.find((t) => t.type === "post" && t.student_id === null);

      if (effectivePre?.file_url) {
        const file = await getFileFromCloud(effectivePre.file_url);
        lesson_ordered.pre_lesson_urls.push(file);
      } else {
        lesson_ordered.pre_lesson_urls.push(null);
      }

      if (effectivePost?.file_url) {
        const file = await getFileFromCloud(effectivePost.file_url);
        lesson_ordered.post_lesson_urls.push(file);
      } else {
        lesson_ordered.post_lesson_urls.push(null);
      }

      const next_lesson_id = current_lesson.next_lesson;
      if (next_lesson_id) {
        current_lesson = allLessonsData.find(
          (lesson) => lesson.id === next_lesson_id,
        );
      } else {
        current_lesson = remainingFallback?.shift() ?? undefined;
      }
    }

    response.push(lesson_ordered);
  }
  return NextResponse.json(response);
}

async function getFileFromCloud(databaseUrl: string) {
  const supabase = await createClient();
  console.log("Link: " + databaseUrl);
  const cleanPath3 = databaseUrl.replace(/^course_files\//, "");
  const { data: filesSlide } = await supabase.storage
    .from("course_files")
    .getPublicUrl(`${cleanPath3}`);

  console.log("Retrieved URL: " + filesSlide.publicUrl);
  return filesSlide.publicUrl;
}
