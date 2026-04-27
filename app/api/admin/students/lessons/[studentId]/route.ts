import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type OrganizedLessons = {
  course_id: string;
  course_name: string;
  lessons: Lesson[];
  status: number[];
  pre_lesson_urls: (String | null)[];
  post_lesson_urls: (String | null)[];
  slide_show_inputs: (String | null)[];
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
  //for each course we need to get the associated lessons for them

  let response = [];
  for (let i = 0; i < assigned_courses.length; i++) {
    const course_id = assigned_courses[i].course_id;

    if (!course_id) continue;

    //Get head lesson of the course
    const { data: courseHeadData, error: courseHeadError } = await supabase
      .from("courses")
      .select("head_lesson_id,title")
      .eq("id", course_id)
      .single();

    console.log("Retrieved Head: " + courseHeadData?.head_lesson_id);
    //Get all the lessons of the course

    const { data: allLessonsData, error: allLessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", course_id);

    if (allLessonsError) {
      return NextResponse.json(
        "Error getting all lessons of associated course " + course_id,
      );
    }

    //get the statuses of the lessons
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

    //get the slide_shows of the lessons
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

    // If no linked-list head is set, fall back to creation order
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
      console.log("Pushing current lesson: " + current_lesson.pre_lesson_url);
      lesson_ordered.lessons.push(current_lesson);
      console.log("*************status ", status);
      if (status) {
        lesson_ordered.status.push(status);
      } else {
        lesson_ordered.status.push(1);
      }

      //set current lesson slide_show_url
      if (current_lesson.slide_show_url) {
        const file = await getFileFromCloud(current_lesson.slide_show_url);
        lesson_ordered.slide_show_inputs.push(file);
      } else {
        lesson_ordered.slide_show_inputs.push(null);
      }

      //set current lesson pre lesson tasks
      if (current_lesson.pre_lesson_url) {
        const file = await getFileFromCloud(current_lesson.pre_lesson_url);
        lesson_ordered.pre_lesson_urls.push(file);
      } else {
        lesson_ordered.pre_lesson_urls.push(null);
      }

      //set current lesson post lesson tasks
      if (current_lesson.post_lesson_url) {
        const file = await getFileFromCloud(current_lesson.post_lesson_url);
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
