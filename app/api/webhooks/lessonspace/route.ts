import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {Resend} from 'resend'
import { EmailTemplate } from "./components/email_template";
export async function POST(
    request: NextRequest
){

    console.log("Hit lessonspace webhook post!")
    const body = await request.json();
    
    const room_id = body.room.id;

    if(body.summary){
        console.log("Has summary body")
        console.log("Summary: " + body.summary);
        //make sure the required key is found
        const RESEND_API_KEY = process.env.RESEND_API_KEY

        if(!RESEND_API_KEY){
            return NextResponse.json({status:404, message:"Unable to find Resend API key to send summary"})
        }
        const resend = new Resend(RESEND_API_KEY);

        //make sure we can actually find company email
        const company_email = process.env.COMPANY_NOTIFICATION_EMAIL;
        if(!company_email){
            return NextResponse.json({status:404, message:"Unable to find company email to send summary"})
        }
         const supabase = await createClient();
        
         //identify the account that the student is associated with
         const {data:studentData, error:studentDataError} = await supabase.from('students').select('account_id, first_name, last_name').eq('webhook_room_id', room_id).single()

         if(!studentData || studentDataError){
            return NextResponse.json({status:404, message: "Unable to identify account in lessonspace webhook"});
         }


         //go into the accounts table and look for the email to send the summary to

         const{data: emailData, error: emailDataError} = await supabase.from('account').select('email').eq('id',studentData.account_id).single();

         if(!emailData || emailDataError){
            return NextResponse.json({status:404, message: "Unable to identify email in lessonspace webhook"});
         }


         //use wdstalkmaze notifications email for setup

         if(!studentData.first_name || !studentData.last_name){
            return NextResponse.json({status:404, message: "Unable to find student name"})
         }
         

         try{
            const {data, error} = await resend.emails.send({
                from: JSON.stringify(company_email),
                to: JSON.stringify(emailData.email),
                subject: 'AI summary',
                react: EmailTemplate({firstName: studentData.first_name, lastName: studentData.last_name, summary: body.summary, date: new Date()}),
            })

             if (error) {
                return Response.json({ error }, { status: 500 });
            }

            return Response.json(data);
         }catch(err){
            return NextResponse.json({status:500, message: "Error sending AI summary"})
         }

    }
    return NextResponse.json({ ok: true });
}