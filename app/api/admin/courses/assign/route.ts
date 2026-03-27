"use server"
import { createClient } from "@/utils/supabase/server";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export async function POST(req: NextRequest){
    
    const supabase = await createClient();
    const body = await req.json();

    const {studentId, courseId} = body;
    console.log("Course id: " + courseId);
    console.log("student id: " + studentId);
    try{
        const {data, error} = await supabase.from('course_assignment').insert({
        course_id: courseId,
        student_id: studentId,
        progress: 0,
        isActive: true
    })
        if(error){
            throw new Error(`Error ${JSON.stringify(error)}`);
        }
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