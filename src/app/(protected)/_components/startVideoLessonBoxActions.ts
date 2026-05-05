"use server";
import { createClient } from "@/src/services/supabase/server";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { CreateRoomParticipant } from "@/src/app/api/webhooks/stripe/learningSpace/route";
import { NextResponse } from "next/server";
export async function getLessonSpace(){

    console.log("Hello Uncle Roger Here")
    const supabase = await createClient();
    const profile = await getActiveProfile();
    const student_id = profile?.id;

    if(!student_id || profile.type !== "student"){
        throw new Error("Unable to identify student")
    }
    try{
        //first get name
        const supabase = await createClient();
        const {data: nameData, error: nameDataError} = await supabase.from('students').select("first_name,last_name,lesson_space_id").eq("id",student_id).single();

        if(!nameData || nameDataError){
            return NextResponse.json({status:404, message: "Unable to find student"})
        }

        const fullName = `${nameData.first_name || ""} ${nameData.last_name || ""}`.trim();

        if(!nameData.lesson_space_id){
            return NextResponse.json({status:404, message: "Unable to find room"});
        }
        const data = await CreateRoomParticipant(fullName,nameData.lesson_space_id,student_id,false);
        
        console.log("Returning student link: " + data.client_url)
        //store url in database

        const {data: supabaseLsInsert, error: supabaseLsInsertError} = await supabase.from('students').update({lesson_space_student_link:data.client_url}).eq('id', student_id)

        if(supabaseLsInsertError){
            console.log("Error storing student link into database")
        }
        return data.client_url;
    }catch(err){
        console.log("Error fetching lesson_space_id for student" + err)
    }
}