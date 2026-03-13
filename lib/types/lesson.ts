export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  created_at: string;
  updated_at: string;
}

export type LessonInput = {
  title: string;
  description?: string | null;
  content_url?: string | null;
};