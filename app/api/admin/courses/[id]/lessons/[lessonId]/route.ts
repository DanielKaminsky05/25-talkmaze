import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await params;
    const body = await req.json();
    const { title, description, content_url,pre_lesson_tasks,post_lesson_tasks} = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: "Lesson title cannot be empty" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const payload: Record<string, unknown> = {};
    if (title !== undefined)       payload.title       = title.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (content_url !== undefined) payload.content_url = content_url?.trim() || null;
    if(pre_lesson_tasks !== undefined) payload.pre_lesson_task = pre_lesson_tasks
    if(post_lesson_tasks !== undefined) payload.post_lesson_task = post_lesson_tasks
    
    console.log("")
    console.log("Post lesson task: " + post_lesson_tasks);
    console.log("Pre lesson task: " + pre_lesson_tasks);
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lessons")
      .update(payload)
      .eq("id", lessonId)
      .eq("course_id", id)
      .select()
      .single();

      console.log("Put data: " + JSON.stringify(data));

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await params;
    const supabase = await createClient();

    //get the prev and next lesson

    const {data: linked_position_data, error: linked_position_error} = await supabase.from('lessons').select('next_lesson, prev_lesson').eq('id',lessonId).single()

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("course_id", id);

    if(linked_position_error){
      return NextResponse.json({status: 500, message: "Unable to determine lesson's position in course"})
    }

    if(linked_position_data){
      if(linked_position_data.prev_lesson != null){

          const {data: prev_lesson_update, error: prev_lesson_update_error} = await supabase.from('lessons').update({next_lesson :linked_position_data.next_lesson}).eq('id', linked_position_data.prev_lesson).single();

          if(prev_lesson_update_error){
            return NextResponse.json({error: 500, message: "Unable to update previous lesson's next pointer"})
          }
        
      }

      if(linked_position_data.next_lesson != null){
        const {data: next_lesson_update, error: next_lesson_update_error} = await supabase.from('lessons').update({prev_lesson: linked_position_data.prev_lesson}).eq('id', linked_position_data.next_lesson).single();
         if(next_lesson_update_error){
            return NextResponse.json({error: 500, message: "Unable to update next lesson's previous pointer"})
          }
      }
    }

  
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete lesson" },
      { status: 500 }
    );
  }
}