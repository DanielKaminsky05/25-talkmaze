import { NextResponse, type NextRequest } from "next/server";
const base_url = "https://api.thelessonspace.com/v2/organizations/30106/sessions/"
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

        console.log("fetching");
        const response = await fetch(base_url, {
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

export function POST(){

}

export function PUT(){

}

export function DELETE(){

}