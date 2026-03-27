import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  
  try {
    const { id } = await params;
    const body = await req.json();
    
    if(!body){
      return NextResponse.json({status: 404, message: "Unable to get user inputted fields"});
    }

    
   const {lesson_id, title, description, content_url} = body;

    if(!lesson_id){
      return NextResponse.json({status: 404, message: "Lesson id not found"})
    }
   
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Lesson title is required" },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
  
    const pre_lesson_url = `course_files/${id}/${lesson_id}/pre_lesson_tasks/`;
    const post_lesson_url = `course_files/${id}/${lesson_id}/post_lesson_tasks/`;
    const slide_show_url = `course_files/${id}/${lesson_id}/lessons/`
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        id: lesson_id,
        course_id: id,
        title: title.trim(),
        description: description?.trim() || null,
        content_url: content_url?.trim() || null,
        pre_lesson_url: pre_lesson_url,
        post_lesson_url: post_lesson_url,
        slide_show_url: slide_show_url
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create lesson" },
      { status: 500 }
    );
  }
}