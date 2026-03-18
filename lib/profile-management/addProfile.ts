"use server"
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { TeachworksClient } from "../teachworks/client";
import { NextResponse } from "next/server";
export type student = {
    student: {
        customer_id: string | null | undefined,
        first_name: string,
        last_name: string,
        birth_date: Date,
        billing_method: 'Service List Cost' | 'Student Cost' | 'Package'|'Flat Fee',
        status: "Active" | "Inactive",
        default_teacher_ids: []
    }
    

}
const teach_works_api_key = process.env.TEACHWORKS_API_KEY;

export async function createStudent(firstname: string, lastname: string, birth_date: Date){
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

    const student: student = {
        student: {
            customer_id: account_tw_obj,
            first_name: firstname,
            last_name: lastname,
            birth_date: birth_date,
            billing_method: "Package",
            status: 'Active',
            default_teacher_ids: []
        }
        
    }
    
    //console.log("Created Student" +  JSON.stringify(student));
    if(!teach_works_api_key){
        console.error("TEACHWORKS_API_KEY is missing");
        return NextResponse.json({
            error: "Server misconfiguration: Missing API Key" },
            { status: 500 }
        );
    }
    const teachworksclient = new TeachworksClient(teach_works_api_key)

    //write to teachworks

    const tw_response = await teachworksclient.postStudent(student);

    return tw_response;




}