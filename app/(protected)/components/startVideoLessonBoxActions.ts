"use server"
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
export async function getLessonSpaceLink(){
    console.log("Inside get lesson space link")
    const cookieStore = await cookies();
    const supabase = await createClient();
    const student_id = cookieStore.get('active_profile_id');
    const student_id_data = student_id?.value;

    if(!student_id_data){
        return NextResponse.json({status:404, message: "Unable to find student id"})
    }
    const {data, error} = await supabase.from('students').select('lesson_space_id').eq('id',student_id_data).single();

    const lesson_space_id = data?.lesson_space_id;

    return lesson_space_id;

}