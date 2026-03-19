

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const base_url = "https://api.thelessonspace.com/v2/organizations/30106/"
const LESSONSPACE_API_KEY = process.env.LESSONSPACE_API_KEY


export async function GET(req: NextRequest){
    console.log("Inside learning_space fetch")
    
    //check if api key is missing
    if(!LESSONSPACE_API_KEY){
        return NextResponse.json(
            {success: false, message: 'Lessonspace API KEY missing'},
            {status: 404}
        )
    }
    try{
        const URL = `base_url${fetch}`
        console.log("fetching");
        const response = await fetch(URL, {
            method: "GET",
            headers: {
                "Content-Type": 'application/json',
                "Authorization": `Organization ${LESSONSPACE_API_KEY}`
            }
        })

        const text = await response.text();
        if(!response.ok){
            console.log("response not ok: " + text);
            return NextResponse.json({
                status: 500
            })
        }
        console.log("response ok");
        
        const response_json = await response.json();
        console.log("Lesson space response: " + response_json);

        return response_json;
    }catch(err){
        return NextResponse.json({
            status: 500
        })
        
    }

    
}

export async function POST(req: NextRequest){
    console.log("Inside post lessonspace")
    const URL = "https://api.thelessonspace.com/v2/spaces/launch/"
    const supabase = await createClient();
    try{
        const body = await req.json();
        const student_id = body.student_id;
        
        if(!student_id){
            throw new Error("Error identifying student")
        }
         const lesson_space_id = await supabase.from('students').select('lesson_space_id').eq('id',student_id)

         if(lesson_space_id){
            return NextResponse.json({status: 200, message: "Student already has an unified learning space"})
         }

        const name = await supabase.from('students').select('name').eq('id',student_id)
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                'Authorization': `Organization ${process.env.LESSONSPACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body:JSON.stringify({
                id: name.data,
                transcribe: true,
                summarize: true,
                record_av: true
            })
        })


        
        const response_json =  await response.json();

        if(!response.ok){
            console.log("Error: " + JSON.stringify(response_json))
        }
        const{data, error} = await supabase.from('students').update({lesson_space_id: response_json.client_url}).eq('id',student_id)

        if(error){
            throw new Error("Supabase Error: " + error);
        }

        console.log("Success making space!")

        //post to supabase
    }catch(err){
        console.log(err);
    }
}