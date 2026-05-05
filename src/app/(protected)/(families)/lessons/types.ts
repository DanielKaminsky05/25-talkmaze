export type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  slug: string | null;
  created_at: string;
};

export type LessonDetailRow = LessonRow & {
  content_url: string | null;
  slide_show_url: string | null;
};

export type TokenRow = {
  id: string;
  title: string;
  icon_url: string | null;
  lesson_id: string | null;
};
