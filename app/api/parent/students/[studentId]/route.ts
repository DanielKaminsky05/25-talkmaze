import { createClient } from "@/services/supabase/server";
import { NextResponse } from "next/server";
export async function GET(
    request: Request,
   { params }: { params: Promise<{ studentId: string }> }
){

    console.log("Inside get specific parent")
    const supabase = await createClient();
    const{studentId} = await params;

    console.log("Parent studentid: " + studentId);

    const {data: accountId, error: accountIdError} = await supabase.from('students').select("account_id").eq("id", studentId).single();

    if(!accountId || accountIdError){
        return NextResponse.json({status:404, message: "Unable to find account"})
    }
    const{data: parentId, error: parentIdError} = await supabase.from('parents').select("id").eq("account_id",accountId.account_id).single()
    

    if(!parentId || parentIdError){
        return NextResponse.json({status:404, message: "Unable to find parent"})
    }

    return NextResponse.json(parentId)


}