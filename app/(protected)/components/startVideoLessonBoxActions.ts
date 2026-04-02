"use server";

import { createClient } from "@/utils/supabase/server";
import { getActiveProfile } from "@/app/api/lib/profile-management/getActiveProfile";

export async function getLessonSpace(){
    const supabase = await createClient();
    const profile = await getActiveProfile();
    const student_id = profile?.id;

    if(!student_id || profile.type !== "student"){
        throw new Error("Unable to identify student")
    }
    try{
        console.log("Retrieving link")
        const {data,error}= await supabase.from('students').select('lesson_space_student_link').eq('id',student_id).single();
        if(!data){
            return;
        }
        

        
        return data.lesson_space_student_link;
    }catch(err){
        console.log("Error fetching lesson_space_id for student" + err)
    }
}