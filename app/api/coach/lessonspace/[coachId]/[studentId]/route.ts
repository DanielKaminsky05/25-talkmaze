import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { CreateTeacherRoom } from "@/app/api/admin/assignments/route";
export async function GET(
    req: NextRequest,
    {params}: {params: Promise<{coachId: string, studentId: string}>}
){
    

    
    
    const {coachId, studentId} = await params;
    console.log("Trying to get all rooms ", coachId)
    try{
        const supabase = await createClient();

        //get coach_id
        const {data: coach_id_data, error: coach_id_data_error} = await supabase.from('coaches').select('*').eq('account_id',coachId).single();

        if(coach_id_data_error){
            return NextResponse.json({status:500,message: "Unable to identify coach"})
        }
        console.log("Retrieved coach id: " + coach_id_data?.id)
        console.log("Whole coach: " + JSON.stringify(coach_id_data))
        const {data: studentData, error: studentDataError} = await supabase.from('students').select("*").eq('id', studentId).single();

        if(studentDataError || !studentData){
            console.log("Error fetching student data for coach page")
            return NextResponse.json({status:500, message: "Error fetching student data"})
        }

        //make a new link for the teacher in case of expiry
        const teacher_link = await CreateTeacherRoom(studentData, coach_id_data)

        //store teacher link into supabase
        const {error: supabaseLsInsert} = await supabase.from('students').update({lesson_space_teacher_link: teacher_link.client_url}).eq('id', studentId)
        return NextResponse.json(teacher_link);

        
        //make new room for coach

        
       
    }catch(err){

    }


}