import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get all students linked to this account_id
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("first_name, last_name,id")
            .eq("account_id", user.id);

        if (studentError || !students || students.length === 0) {
            return NextResponse.json([]);
        }


        
        return NextResponse.json(students.filter(Boolean));

    } catch (error: any) {
        console.error("Error in /api/parent/students:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
