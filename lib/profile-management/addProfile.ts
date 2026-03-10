"use server"
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { TeachworksClient } from "../teachworks/client";
import { NextResponse } from "next/server";
type student = {
    "customer_id": string,
    "first_name": string,
    "last_name": string,
    "birth_date": Date,
    "billing_method": "Talk Maze Platform",
    "status": "Active" | "Inactive",
    "default_teacher_ids": []

}

const supabase = createClient();
const cookieStore = await cookies();

const teach_works_api_key = process.env.TEACHWORKS_API_KEY;


async function createStudent(firstname: string, lastname: string, birth_date: Date){
    //first create in teachworks then create in supabase
    console.log("Inside create Student")
    const account_cookie = await cookieStore.get("account_id");
    const account_id = JSON.stringify(account_cookie?.value);
    const account_tw_id = (await supabase).from('account').select('tw_customer_id').eq('id',account_id);

    const student: student = {
        customer_id: JSON.stringify(account_tw_id),
        first_name: firstname,
        last_name: lastname,
        birth_date: birth_date,
        billing_method: "Talk Maze Platform",
        status: 'Active',
        default_teacher_ids: []
    }
    
    console.log("Created Student" +  JSON.stringify(student));
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





}