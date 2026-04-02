import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveProfile } from "@/app/api/lib/profile-management/getActiveProfile";

export async function getProgress(){

    const supabase = await createClient()
    const profile = await getActiveProfile();
    const student_id = profile?.id;

    if(!student_id || profile.type !== "student"){
        throw NextResponse.json({status: 500,message: "Error identifying student"})
    }
    try{
        const res1 = await supabase.from('course_assignment').select('progress, course_id').eq('student_id',student_id).eq('isActive',true).single()

        if(res1.error){
            throw NextResponse.json({status: 500,message: "Supabase fetching error"})
        }

        //get the total
        /*
        const res2 = await supabase.from('lessons').select('id').eq('course_id',res1.data.course_id).single()

        
        return {res1.data.progress,res2.data.size()}
        */

       
    }catch(err){
        throw NextResponse.json({status: 500,message: "Error getting progress"})
    }
}



