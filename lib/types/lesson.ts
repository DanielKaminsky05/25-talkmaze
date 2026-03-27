export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  created_at: string;
  updated_at: string;
  pre_lesson_tasks: File[] | [];
  post_lesson_tasks: File[] | [];
  slide_show_input: File[] | [];
}

export type LessonInput = {
  title: string;
  description?: string | null;
  content_url?: string | null;
  pre_lesson_tasks: File[] | null;
  post_lesson_tasks: File[] | null;
  slide_show_input: File[] | null;
};