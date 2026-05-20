"use server"
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export async function POST(req: NextRequest){
    const auth = await requireRole([3]);
    if (auth instanceof NextResponse) return auth;
    const { supabase } = auth;

    const body = await req.json();

    const {studentId, courseId} = body;

    try{

        const{data:lessons, error: lessons_error} = await supabase.from('lessons').select("id").eq("course_id",courseId);

        if(lessons_error){
            console.error("courses/assign: fetch lessons error", lessons_error);
            return NextResponse.json({ error: "Can not fetch lessons associated with course" }, { status: 500 })
        }
        

        //array of objects to be pushed to supabase
        const posted_lessons = []

        for(let i = 0; i < lessons.length; i++){
            const newEntry = {
                student_id: studentId,
                status: 1,
                lesson_id: lessons[i].id
            }

            posted_lessons.push(newEntry);
        }

        //push all the new lessons to the lesson_progress table

        const{data: push_lessons_data, error: push_lessons_data_error} = await supabase.from('lesson_progress').insert(posted_lessons)

        if(push_lessons_data_error){
            console.error("courses/assign: push lessons error", push_lessons_data_error)
            return NextResponse.json({ error: "Unable to update database to assign course lessons to user" }, { status: 500 })
        }
        //add course assigned into course assignment table
        const {data, error} = await supabase.from('course_assignment').insert({
        course_id: courseId,
        student_id: studentId,
        progress: 0,
        isActive: true
        })
        if(error){
            throw new Error(`Error ${JSON.stringify(error)}`);
        }
        
        //Also need to add to lesson_progress table with all status 0s
    
    
   
    
    return NextResponse.json({ success: true })
    }catch(err: unknown){
        console.error("courses/assign error", err);
        return NextResponse.json({ error: "Error assigning student" }, { status: 500 })
    }


}

export async function GET(req: NextRequest){
    const auth = await requireRole([3]);
    if (auth instanceof NextResponse) return auth;
    const { supabase } = auth;

    //only get the students that arent assigned in this course

    const body = await req.json();
    const{course_id} = body;

    const { data: assigned, error: assignedError } = await supabase
        .from("course_assignment")
        .select("student_id")
        .eq("course_id", course_id);

    if(assignedError){
        console.error("courses/assign GET: error getting assigned students", assignedError);
    }

    if(!assigned){
        return NextResponse.json({ error: "Error fetching assigned students" }, { status: 500 });
    }
    const assignedIds = assigned.map((a) => a.student_id);


    const { data, error } = await supabase
        .from("students")
        .select("*")
        .not("id", "in", `(${assignedIds.join(",")})`);

    return NextResponse.json(data);


}