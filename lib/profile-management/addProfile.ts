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
    const account_id = (await cookieStore).get("account_id")?.value;
    
    if(!account_id){
        console.error("Account ID cookie is missing in createStudent");
        throw new Error("Session expired or missing. Please log in again.");
    }
    
    const account_tw_id_obj= await supabase.from('account').select('tw_customer_id').eq('id',account_id).single();

    const account_tw_obj = account_tw_id_obj.data?.tw_customer_id;

    if(!teach_works_api_key){
        console.error("TEACHWORKS_API_KEY is missing");
        throw new Error("Service configuration error. Please contact support.");
    }
    const teachworksclient = new TeachworksClient(teach_works_api_key)

    //write to teachworks

    const tw_response = await teachworksclient.postStudent(student_obj);
    
    return tw_response as TeachworksStudent;




}