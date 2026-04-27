"use server"
import { createClient } from "@/services/supabase/server";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export async function POST(req: NextRequest){
    
    console.log("Inside Assign courses");
    const supabase = await createClient();
    const body = await req.json();

    const {studentId, courseId} = body;
    console.log("Course id: " + courseId);
    console.log("student id: " + studentId);

    
    try{

        const{data:lessons, error: lessons_error} = await supabase.from('lessons').select("id").eq("course_id",courseId);

        if(lessons_error){
            console.log("Lessons Error");
            return NextResponse.json({status:500, message: "Can not fetch lessons associated with course"})
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
            console.log("push lessons error ", push_lessons_data_error)
            return NextResponse.json({error: 500, message: "Unable to update database to assign course lessons to user"})
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
    
    
   
    
    return NextResponse.json({status:200})
    }catch(err){
        console.log("Err assigning student: " + err);
        return NextResponse.json({status:500, message:"Error assigning student"})
    }
  
      
}

export async function GET(req: NextRequest){
    //only get the students that arent assigned in this course

    const body = await req.json();
    const{course_id} = body;

    const supabase = await createClient();

    const { data: assigned, error: assignedError } = await supabase
        .from("course_assignment")
        .select("student_id")
        .eq("course_id", course_id);

    if(assignedError){
        console.log("Error getting the assigned students: " + assignedError);
    }

    if(!assigned){
        return NextResponse.json({status: 500, message: "Error fetching assigned students"});
    }
    const assignedIds = assigned.map((a) => a.student_id);


    const { data, error } = await supabase
        .from("students")
        .select("*")
        .not("id", "in", `(${assignedIds.join(",")})`);

    return NextResponse.json(data);


}