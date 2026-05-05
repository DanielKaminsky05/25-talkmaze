import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/services/supabase/server";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import ParentStudentLessonsClient, {
  LessonProp,
} from "./ParentStudentLessonsClient";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default async function ParentStudentLessonsPage({ params }: PageProps) {
  const { studentId } = await params;
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Verify the student belongs to this parent's account
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, avatar_url, account_id")
    .eq("id", studentId)
    .single();

  if (!student || (student as any).account_id !== user.id) notFound();

  const studentName =
    [
      `${(student as any).first_name ?? ""}`,
      `${(student as any).last_name ?? ""}`,
    ]
      .filter(Boolean)
      .join(" ") || "Student";

  // Fetch active course assignment
  const { data: courseAssignment } = await supabase
    .from("course_assignment")
    .select("course_id")
    .eq("student_id", studentId)
    .limit(1)
    .maybeSingle();

  if (!courseAssignment?.course_id) {
    return (
      <ParentStudentLessonsClient
        studentName={studentName}
        courseName={null}
        lessons={[]}
        progress={{ completed: 0, total: 0 }}
      />
    );
  }

  const courseId = courseAssignment.course_id as string;

  // Fetch course info and all lessons in parallel
  const [courseResult, lessonsResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, head_lesson_id")
      .eq("id", courseId)
      .single(),
    supabase
      .from("lessons")
      .select("id, title, slug, next_lesson")
      .eq("course_id", courseId),
  ]);

  const course = courseResult.data as any;
  const lessonsRaw = (lessonsResult.data ?? []) as {
    id: string;
    title: string;
    slug: string | null;
    next_lesson: string | null;
  }[];

  // Traverse the linked list to get lessons in display order
  const lessonMap = new Map(lessonsRaw.map((l) => [l.id, l]));
  const orderedLessons: typeof lessonsRaw = [];
  let cur: string | null = course?.head_lesson_id ?? null;
  while (cur) {
    const node = lessonMap.get(cur);
    if (!node) break;
    orderedLessons.push(node);
    cur = node.next_lesson;
  }
  const finalLessons = orderedLessons.length > 0 ? orderedLessons : lessonsRaw;
  const lessonIds = finalLessons.map((l) => l.id);

  // Fetch progress and tokens in parallel
  const [progressResult, tokensResult] = await Promise.all([
    lessonIds.length > 0
      ? supabase
          .from("lesson_progress")
          .select("lesson_id, status, positive_feedback, improvement_feedback")
          .eq("student_id", studentId)
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
    lessonIds.length > 0
      ? supabase
          .from("tokens")
          .select("id, title, icon_url, lesson_id")
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const progressRows = (progressResult.data ?? []) as {
    lesson_id: string;
    status: number;
    positive_feedback: string | null;
    improvement_feedback: string | null;
  }[];
  const allTokens = (tokensResult.data ?? []) as {
    id: string;
    title: string;
    icon_url: string | null;
    lesson_id: string | null;
  }[];

  const progressMap = new Map(progressRows.map((p) => [p.lesson_id, p]));
  const completedLessonIds = new Set(
    progressRows.filter((p) => p.status === 3).map((p) => p.lesson_id),
  );

  // Determine the first incomplete lesson to compute locked state
  const firstIncompleteIdx = finalLessons.findIndex(
    (l) => !completedLessonIds.has(l.id),
  );

  const lessons: LessonProp[] = finalLessons.map((lesson, index) => {
    const progress = progressMap.get(lesson.id);
    const token = allTokens.find((t) => t.lesson_id === lesson.id);
    const isCompleted = completedLessonIds.has(lesson.id);
    const isLocked = firstIncompleteIdx !== -1 && index > firstIncompleteIdx;

    return {
      id: lesson.id,
      title: lesson.title,
      lessonNumber: index + 1,
      tokenTitle: token?.title ?? null,
      tokenIcon: token?.icon_url ?? "🧭",
      isCompleted,
      isLocked,
      status: progress?.status ?? 1,
      positiveFeedback: progress?.positive_feedback ?? null,
      improvementFeedback: progress?.improvement_feedback ?? null,
    };
  });

  const completedCount = lessons.filter((l) => l.isCompleted).length;

  return (
    <ParentStudentLessonsClient
      studentName={studentName}
      courseName={course?.title ?? null}
      lessons={lessons}
      progress={{ completed: completedCount, total: lessons.length }}
    />
  );
}
