"use server"
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { TeachworksClient } from "../teachworks/client";
import { NextResponse } from "next/server";
import { TeachworksStudent } from "../teachworks/types";



const teach_works_api_key = process.env.TEACHWORKS_API_KEY;

export async function createStudent(student_obj: object){
    const supabase = await createClient();
    const cookieStore = await cookies();

    //first create in teachworks then create in supabase
    const account_cookie = await cookieStore.get("account_id");
    
    if(!account_cookie){
        throw new Error("cookie doesn't exist")
    }
    const account_id = account_cookie?.value;
    
    const account_tw_id_obj= await supabase.from('account').select('tw_customer_id').eq('id',account_id).single();

    const account_tw_obj = account_tw_id_obj.data?.tw_customer_id;

    //console.log("Created Student" +  JSON.stringify(student));
    if(!teach_works_api_key){
        console.error("TEACHWORKS_API_KEY is missing");
        throw new Error("Missing API KEY!")
    }
    const teachworksclient = new TeachworksClient(teach_works_api_key)

    //write to teachworks

    const tw_response = await teachworksclient.postStudent(student_obj);
    
    return tw_response as TeachworksStudent;




}