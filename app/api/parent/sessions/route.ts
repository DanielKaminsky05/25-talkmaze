import { createClient } from "@/services/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get all student IDs for this account
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id")
            .eq("account_id", user.id);

        if (studentError || !students || students.length === 0) {
            return NextResponse.json([]);
        }

        const studentIds = students.map(s => s.id);

        // 2. Fetch all sessions for these students
        const { data: sessions, error: sessionError } = await supabase
            .from("sessions")
            .select(`
                id,
                start_time,
                end_time,
                weekday,
                student_id,
                coach_id,
                students (
                    first_name,
                    last_name
                ),
                coaches (
                    name
                )
            `)
            .in("student_id", studentIds)
            .order("start_time", { ascending: true });

        if (sessionError) {
            console.error("Session fetch error:", sessionError);
            return NextResponse.json({ error: sessionError.message }, { status: 500 });
        }

        return NextResponse.json(sessions);

    } catch (error: any) {
        console.error("Error in /api/parent/sessions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
